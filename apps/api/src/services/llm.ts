/**
 * Multi-provider LLM service for bot agents.
 * Supports Gemini (Google) and Groq.
 */

interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  provider: string;
  model?: string;
  maxTokens?: number;
}

interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

const PROVIDER_DEFAULTS: Record<string, { model: string; url: string }> = {
  gemini: {
    model: 'gemini-2.0-flash',
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    url: 'https://api.groq.com/openai/v1/chat/completions',
  },
};

async function callGemini(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = req.model || PROVIDER_DEFAULTS.gemini.model;
  const url = `${PROVIDER_DEFAULTS.gemini.url}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: req.systemPrompt }] },
      contents: [{ parts: [{ text: req.userPrompt }] }],
      generationConfig: {
        maxOutputTokens: req.maxTokens || 4096,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Empty response from Gemini');

  return {
    content,
    provider: 'gemini',
    model,
    tokensUsed: data.usageMetadata?.totalTokenCount,
  };
}

async function callGroq(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const model = req.model || PROVIDER_DEFAULTS.groq.model;

  const response = await fetch(PROVIDER_DEFAULTS.groq.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      max_tokens: req.maxTokens || 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq');

  return {
    content,
    provider: 'groq',
    model,
    tokensUsed: data.usage?.total_tokens,
  };
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  switch (req.provider) {
    case 'gemini':
      return callGemini(req);
    case 'groq':
      return callGroq(req);
    default:
      throw new Error(`Unknown LLM provider: ${req.provider}`);
  }
}

// --- Tool-calling support for Groq (OpenAI-compatible function calling) ---

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

import type { GroqToolDef } from './tools/index';

export async function callGroqWithTools(
  messages: ChatMessage[],
  tools: GroqToolDef[],
  model?: string,
): Promise<ChatMessage> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const body: Record<string, any> = {
    model: model || PROVIDER_DEFAULTS.groq.model,
    messages,
    max_tokens: 4096,
    temperature: 0.7,
  };

  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(PROVIDER_DEFAULTS.groq.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new Error('Empty response from Groq');

  return {
    role: 'assistant',
    content: msg.content || null,
    tool_calls: msg.tool_calls || undefined,
  };
}

export function buildTaskPrompt(task: {
  title: string;
  description: string;
  category: string;
  reward: number;
}): string {
  return `You have been assigned the following task on the Hiragen marketplace.

**Task:** ${task.title}
**Category:** ${task.category}
**Budget:** $${task.reward.toLocaleString()}
**Description:**
${task.description}

Complete this task thoroughly and professionally. Provide your full deliverable below.
Format your response clearly with sections, headers, and structured content where appropriate.
Be detailed and deliver real, actionable work — not summaries or placeholders.`;
}
