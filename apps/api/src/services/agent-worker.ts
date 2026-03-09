/**
 * Autonomous Agent Worker
 * Background service that monitors open tasks and dispatches bot agents to apply.
 * Bot agents apply to tasks instead of auto-grabbing. After 2 minutes with no
 * creator action, the best applicant is auto-accepted and executes the task.
 */

import { PrismaClient } from '@prisma/client';
import { callLLM, buildTaskPrompt, callGroqWithTools, ChatMessage } from './llm';
import { getTool, getGroqToolDefinitions, getFilteredToolDefinitions, ToolExecutionContext } from './tools/index';
import { decrypt } from '../utils/crypto';
import { WebhookService } from './webhook';

const POLL_INTERVAL_MS = 20_000; // Check for new tasks every 20 seconds
const HOUR_MS = 60 * 60 * 1000;
const MAX_TOOL_ITERATIONS = 8;
const AUTO_ACCEPT_DELAY_MS = 2 * 60 * 1000; // 2 minutes

// Category mapping: task category → agent skill keywords
const CATEGORY_SKILLS: Record<string, string[]> = {
  CONTENT_WRITING: ['SEO', 'Content Writing', 'Blog Posts', 'Copywriting', 'Technical Writing'],
  DATA_ANALYSIS: ['Data Analysis', 'Analytics', 'Research', 'On-Chain Analytics'],
  WEB_DEVELOPMENT: ['React', 'Next.js', 'TypeScript', 'Full-Stack', 'Web Development'],
  MARKETING: ['Marketing', 'Ad Copy', 'Email Campaigns', 'Social Media', 'Copywriting'],
  DATA_SCRAPING: ['Web Scraping', 'Data Extraction', 'Automation', 'API Integration'],
  BLOCKCHAIN: ['Blockchain', 'DeFi', 'Smart Contracts', 'Token Research', 'On-Chain Analytics'],
  DESIGN: ['UI Design', 'UX', 'Figma', 'Graphic Design', 'Branding'],
  AUTOMATION: ['Workflow', 'CI/CD', 'DevOps', 'Automation', 'Scripting'],
  SMART_CONTRACT_AUDIT: ['Solidity', 'Smart Contracts', 'Security', 'Audit'],
  API_INTEGRATION: ['API', 'REST', 'GraphQL', 'Integration', 'Webhook'],
  GITHUB_AUTOMATION: ['GitHub', 'Git', 'Pull Requests', 'Code Review', 'CI/CD'],
  ON_CHAIN_ANALYTICS: ['Blockchain', 'DeFi', 'Wallet Analysis', 'Token Research', 'On-Chain Analytics'],
  SOCIAL_MEDIA_AUTOMATION: ['Social Media', 'Twitter', 'Discord', 'Telegram', 'Community'],
  EMAIL_AUTOMATION: ['Email', 'SMTP', 'Campaigns', 'Newsletters', 'Drip Sequences'],
  WORKFLOW_AUTOMATION: ['Automation', 'API Integration', 'Workflow', 'Webhook', 'Scheduling'],
  DEVOPS: ['Docker', 'CI/CD', 'Infrastructure', 'Cloud', 'DevOps'],
  SECURITY_ANALYSIS: ['Security', 'Vulnerability', 'Penetration Testing', 'Audit'],
  OTHER: [],
};

export class AgentWorker {
  private prisma: PrismaClient;
  private webhookService: WebhookService;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private processing = new Set<string>(); // "taskId:agentId" pairs currently being processed

  constructor(prisma: PrismaClient, webhookService?: WebhookService) {
    this.prisma = prisma;
    this.webhookService = webhookService || new WebhookService(prisma);
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log('[AgentWorker] Started — polling every', POLL_INTERVAL_MS / 1000, 'seconds');
    this.tick(); // Run immediately once
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[AgentWorker] Stopped');
  }

  private async tick() {
    try {
      // Phase 1: Bot agents apply to open tasks
      await this.applyToOpenTasks();

      // Phase 2: Auto-accept pending applications after delay
      await this.checkPendingApplications();
    } catch (err) {
      console.error('[AgentWorker] Tick error:', err);
    }
  }

  /**
   * Phase 1: Find open tasks and have matching bot agents apply
   */
  private async applyToOpenTasks() {
    const openTasks = await this.prisma.task.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    for (const task of openTasks) {
      const agents = await this.findMatchingAgents(task);
      for (const agent of agents) {
        const key = `${task.id}:${agent.id}`;
        if (this.processing.has(key)) continue;

        // Check if already applied
        const existing = await this.prisma.taskApplication.findUnique({
          where: { taskId_agentId: { taskId: task.id, agentId: agent.id } },
        });
        if (existing) continue;

        // Check rate limit
        if (!(await this.checkRateLimit(agent))) continue;

        const message = this.generateApplicationMessage(agent, task);
        try {
          await this.prisma.taskApplication.create({
            data: {
              taskId: task.id,
              agentId: agent.id,
              message,
              bidPrice: task.reward,
            },
          });
          console.log(`[AgentWorker] Agent "${agent.name}" applied to task "${task.title}"`);
        } catch {
          // Unique constraint violation — already applied (race condition)
        }
      }
    }
  }

  /**
   * Phase 2: Auto-accept the best applicant after 2 minutes
   */
  private async checkPendingApplications() {
    const cutoff = new Date(Date.now() - AUTO_ACCEPT_DELAY_MS);

    // Find OPEN tasks that have at least one application older than the cutoff
    const tasksWithApps = await this.prisma.task.findMany({
      where: {
        status: 'OPEN',
        applications: {
          some: { status: 'PENDING', createdAt: { lte: cutoff } },
        },
      },
      include: {
        applications: {
          where: { status: 'PENDING' },
          include: { agent: true },
        },
      },
      take: 5,
    });

    for (const task of tasksWithApps) {
      if (task.applications.length === 0) continue;

      // Score all applicants and pick the best
      const best = this.scoreBestApplicant(task, task.applications);
      if (!best) continue;

      const key = `${task.id}:${best.agentId}`;
      if (this.processing.has(key)) continue;
      this.processing.add(key);

      console.log(`[AgentWorker] Auto-accepting "${best.agent.name}" for task "${task.title}"`);

      try {
        // Transaction: accept best, reject others, assign task
        await this.prisma.$transaction(async (tx: any) => {
          await tx.taskApplication.update({
            where: { id: best.id },
            data: { status: 'ACCEPTED' },
          });
          await tx.taskApplication.updateMany({
            where: { taskId: task.id, id: { not: best.id }, status: 'PENDING' },
            data: { status: 'REJECTED' },
          });
          await tx.task.update({
            where: { id: task.id },
            data: { status: 'ASSIGNED', assignedAgentId: best.agentId },
          });
        });

        // Fire webhook for task assignment
        this.webhookService.fire('task.assigned', {
          taskId: task.id,
          agentId: best.agentId,
          agentName: best.agent.name,
          title: task.title,
          reward: task.reward,
        }).catch(() => {});

        // Execute the task in background
        this.executeAssignedTask(task, best.agent).finally(() => this.processing.delete(key));
      } catch (err) {
        console.error(`[AgentWorker] Auto-accept failed for task ${task.id}:`, err);
        this.processing.delete(key);
      }
    }
  }

  /**
   * Find all matching bot agents for a task (not just one)
   */
  private async findMatchingAgents(task: any) {
    const botAgents = await this.prisma.agent.findMany({
      where: { isBot: true, isActive: true, autoAccept: true },
    });

    if (botAgents.length === 0) return [];

    // Filter by reward limit and category match
    return botAgents.filter((a: any) => {
      if (task.reward > a.maxTaskReward) return false;
      const agentCategories: string[] = JSON.parse(a.categories || '[]');
      return agentCategories.length === 0 || agentCategories.includes(task.category);
    });
  }

  /**
   * Score applicants and return the best one
   */
  private scoreBestApplicant(task: any, applications: any[]) {
    const taskSkills = CATEGORY_SKILLS[task.category] || [];
    let best: any = null;
    let bestScore = -1;

    for (const app of applications) {
      const agent = app.agent;
      const agentSkills: string[] = JSON.parse(agent.skills || '[]');
      const overlap = taskSkills.filter((s: string) =>
        agentSkills.some((as: string) => as.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(as.toLowerCase()))
      ).length;
      const score = overlap * 10 + agent.rating * 5 + agent.successRate;

      if (score > bestScore) {
        bestScore = score;
        best = app;
      }
    }

    return best;
  }

  /**
   * Generate a human-readable application message for a bot agent
   */
  private generateApplicationMessage(agent: any, task: any): string {
    const skills: string[] = JSON.parse(agent.skills || '[]');
    const relevantSkills = skills.slice(0, 3).join(', ');
    return `Hi! I'm ${agent.name}, specialized in ${relevantSkills}. I've completed ${agent.tasksCompleted} tasks with a ${agent.successRate}% success rate. I'd love to work on "${task.title}" and deliver high-quality results within the deadline.`;
  }

  /**
   * Execute an assigned task via LLM (extracted from old processTask)
   */
  private async executeAssignedTask(task: any, agent: any) {
    try {
      // Start the task
      await this.prisma.task.update({
        where: { id: task.id },
        data: { status: 'IN_PROGRESS' },
      });

      // Build integration context
      const allowedPlatforms: string[] = JSON.parse(task.allowedIntegrations || '[]');
      let toolContext: ToolExecutionContext = { taskId: task.id, userId: task.creatorId };

      if (allowedPlatforms.length > 0) {
        const userIntegrations = await this.prisma.userIntegration.findMany({
          where: { userId: task.creatorId, platform: { in: allowedPlatforms } },
        });
        const integrations: Record<string, any> = {};
        for (const ui of userIntegrations) {
          try {
            integrations[ui.platform] = JSON.parse(decrypt(ui.encryptedConfig));
          } catch (err) {
            console.error(`[AgentWorker] Failed to decrypt ${ui.platform} integration:`, err);
          }
        }
        toolContext.integrations = integrations;
      }

      // Execute via LLM
      const allEnabledTools: string[] = JSON.parse(agent.enabledTools || '[]');
      const enabledTools = getFilteredToolDefinitions(allEnabledTools, allowedPlatforms);
      const systemPrompt = agent.systemPrompt || this.defaultSystemPrompt(agent, enabledTools, allowedPlatforms);
      const userPrompt = buildTaskPrompt(task);

      console.log(`[AgentWorker] Agent "${agent.name}" executing task via ${agent.llmProvider}...`);

      let finalContent: string;
      const toolExecutionRecords: Array<{
        taskId: string;
        toolName: string;
        input: string;
        output: string;
        durationMs: number;
        success: boolean;
        error: string | null;
      }> = [];

      if (enabledTools.length > 0 && agent.llmProvider === 'groq') {
        // ReAct tool loop
        const toolDefs = getGroqToolDefinitions(enabledTools);
        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        let iterations = 0;
        finalContent = '';

        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;
          console.log(`[AgentWorker] "${agent.name}" ReAct iteration ${iterations}/${MAX_TOOL_ITERATIONS}`);

          const assistantMsg = await callGroqWithTools(messages, toolDefs, agent.llmModel || undefined);
          messages.push(assistantMsg);

          if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
            for (const toolCall of assistantMsg.tool_calls) {
              const toolName = toolCall.function.name;
              const tool = getTool(toolName);
              let toolOutput: string;
              let success = true;
              let error: string | null = null;
              const start = Date.now();

              if (!tool) {
                toolOutput = `Error: Unknown tool "${toolName}"`;
                success = false;
                error = toolOutput;
              } else {
                try {
                  const args = JSON.parse(toolCall.function.arguments);
                  console.log(`[AgentWorker]   → Tool: ${toolName}(${JSON.stringify(args).slice(0, 100)})`);
                  toolOutput = await tool.execute(args, toolContext);
                } catch (err: any) {
                  toolOutput = `Error executing ${toolName}: ${err.message}`;
                  success = false;
                  error = err.message;
                }
              }

              const durationMs = Date.now() - start;
              console.log(`[AgentWorker]   ← ${toolName} completed in ${durationMs}ms (${success ? 'ok' : 'error'})`);

              toolExecutionRecords.push({
                taskId: task.id,
                toolName,
                input: toolCall.function.arguments,
                output: toolOutput.slice(0, 8000),
                durationMs,
                success,
                error,
              });

              messages.push({
                role: 'tool',
                content: toolOutput,
                tool_call_id: toolCall.id,
              });
            }
          } else if (assistantMsg.content) {
            finalContent = assistantMsg.content;
            break;
          }
        }

        if (!finalContent) {
          console.log(`[AgentWorker] "${agent.name}" max iterations reached, forcing final response`);
          const finalMsg = await callGroqWithTools(messages, [], agent.llmModel || undefined);
          finalContent = finalMsg.content || 'Task completed. See tool execution logs for details.';
        }

        if (toolExecutionRecords.length > 0) {
          await this.prisma.toolExecution.createMany({ data: toolExecutionRecords });
          console.log(`[AgentWorker] Logged ${toolExecutionRecords.length} tool executions`);
        }
      } else {
        const result = await callLLM({
          systemPrompt,
          userPrompt,
          provider: agent.llmProvider!,
          model: agent.llmModel || undefined,
        });
        finalContent = result.content;
        console.log(`[AgentWorker] Agent "${agent.name}" completed task (${result.tokensUsed || '?'} tokens)`);
      }

      // Extract deliverables from tool executions
      const deliverables: Array<{ taskId: string; type: string; label: string; value: string; verified: boolean }> = [];
      for (const exec of toolExecutionRecords) {
        if (exec.success) {
          // Extract URLs from file_generate results
          if (exec.toolName === 'file_generate' && exec.output.includes('Download URL:')) {
            const urlMatch = exec.output.match(/Download URL: (.+)/);
            if (urlMatch) {
              deliverables.push({ taskId: task.id, type: 'file', label: `Generated file`, value: urlMatch[1], verified: true });
            }
          }
          // Extract GitHub PR URLs
          if (exec.toolName === 'github_create_pr' && exec.output.includes('URL:')) {
            const urlMatch = exec.output.match(/URL: (.+)/);
            if (urlMatch) {
              deliverables.push({ taskId: task.id, type: 'github_pr', label: 'GitHub Pull Request', value: urlMatch[1], verified: true });
            }
          }
          // Extract GitHub file commits
          if (exec.toolName === 'github_write_file' && exec.output.includes('URL:')) {
            const urlMatch = exec.output.match(/URL: (.+)/);
            if (urlMatch) {
              deliverables.push({ taskId: task.id, type: 'url', label: 'GitHub commit', value: urlMatch[1], verified: true });
            }
          }
          // Extract GitHub issues
          if (exec.toolName === 'github_create_issue' && exec.output.includes('URL:')) {
            const urlMatch = exec.output.match(/URL: (.+)/);
            if (urlMatch) {
              deliverables.push({ taskId: task.id, type: 'url', label: 'GitHub Issue', value: urlMatch[1], verified: true });
            }
          }
          // Discord/Slack/Telegram sends are deliverables
          if (['discord_send', 'slack_send', 'telegram_send', 'twitter_post'].includes(exec.toolName) && exec.output.includes('success')) {
            deliverables.push({ taskId: task.id, type: 'api_response', label: `${exec.toolName.replace('_', ' ')} executed`, value: exec.output.slice(0, 500), verified: true });
          }
          // Email sends
          if (exec.toolName === 'email_send' && exec.output.includes('messageId')) {
            deliverables.push({ taskId: task.id, type: 'api_response', label: 'Email sent', value: exec.output.slice(0, 500), verified: true });
          }
        }
      }

      // Save deliverables
      if (deliverables.length > 0) {
        await this.prisma.deliverable.createMany({ data: deliverables });
        console.log(`[AgentWorker] Saved ${deliverables.length} deliverables for task "${task.title}"`);
      }

      // Submit the result
      await this.prisma.task.update({
        where: { id: task.id },
        data: { status: 'SUBMITTED', resultDescription: finalContent },
      });

      // Increment rate limit counter
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { tasksThisHour: { increment: 1 } },
      });

      console.log(`[AgentWorker] Task "${task.title}" submitted successfully`);

      // Fire webhook
      this.webhookService.fire('task.submitted', {
        taskId: task.id,
        agentId: agent.id,
        title: task.title,
        reward: task.reward,
      }).catch(() => {});
    } catch (err) {
      console.error(`[AgentWorker] Failed to execute task ${task.id}:`, err);
      try {
        const current = await this.prisma.task.findUnique({ where: { id: task.id } });
        if (current && current.status !== 'OPEN') {
          await this.prisma.task.update({
            where: { id: task.id },
            data: { status: 'OPEN', assignedAgentId: null },
          });
        }
      } catch { /* ignore revert errors */ }
    }
  }

  private async checkRateLimit(agent: any): Promise<boolean> {
    const now = new Date();
    const lastReset = new Date(agent.lastHourReset);

    if (now.getTime() - lastReset.getTime() > HOUR_MS) {
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { tasksThisHour: 0, lastHourReset: now },
      });
      return true;
    }

    return agent.tasksThisHour < agent.maxTasksPerHour;
  }

  private defaultSystemPrompt(agent: any, enabledTools: string[] = [], allowedPlatforms: string[] = []): string {
    const skills: string[] = JSON.parse(agent.skills || '[]');
    let prompt = `You are "${agent.name}", an autonomous AI agent on the Hiragen marketplace.
Your specialties: ${skills.join(', ')}.
${agent.description}

CRITICAL RULES — Your work must be WORTH PAYING FOR:
- You are NOT a free chatbot. Users PAY real money for your work via escrow.
- ALWAYS use your tools to DO real things — don't just write text about what could be done.
- If you have web_search/web_scrape: research REAL data, current stats, live information.
- If you have file_generate: CREATE actual downloadable files (CSV reports, JSON datasets, HTML pages).
- If you have github tools: MAKE real commits, PRs, issues on actual repositories.
- If you have integration tools: ACTUALLY send messages, post tweets, deliver emails.
- If you have http_request: CALL real APIs, fetch live data, trigger real automations.
- If you have on-chain tools: QUERY real blockchain data, analyze real wallets and transactions.
- If you have code_execute: RUN actual code to process data, not just write pseudocode.
- If you have smart_contract_read: READ real contract state from Base network.

DELIVERABLES:
- Every task must produce VERIFIABLE output — URLs, files, transaction hashes, API responses.
- Format your final response with clear sections showing what you DID (actions taken) and what was PRODUCED (deliverables).
- Include links to all generated files, commits, messages sent, etc.
- Never deliver content that a free LLM could generate. Your value is in ACTIONS and REAL DATA.`;

    if (enabledTools.length > 0) {
      prompt += `

You have access to the following tools: ${enabledTools.join(', ')}.
USE THEM AGGRESSIVELY. Make multiple tool calls. Gather real data. Take real actions. Generate real files.
The more tools you use effectively, the more valuable your deliverable.`;

      if (allowedPlatforms.length > 0) {
        prompt += `\n\nYou have AUTHORIZED access to integration actions for: ${allowedPlatforms.join(', ')}.
The user has explicitly granted you permission to take actions on these platforms. USE THEM to deliver results.`;
      }
    }

    return prompt;
  }
}
