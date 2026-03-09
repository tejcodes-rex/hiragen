/**
 * Tool Registry — registers all agent tools and exposes them for the ReAct loop.
 */

export interface ToolExecutionContext {
  integrations?: Record<string, any>; // platform → decrypted config
  taskId?: string;
  userId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
  requiresIntegration?: string; // platform name if this tool needs an integration
  execute: (args: Record<string, any>, context?: ToolExecutionContext) => Promise<string>;
}

export interface GroqToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

const registry = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition) {
  registry.set(tool.name, tool);
  console.log(`[Tools] Registered: ${tool.name}`);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function getGroqToolDefinitions(toolNames: string[]): GroqToolDef[] {
  return toolNames
    .map((name) => registry.get(name))
    .filter((t): t is ToolDefinition => !!t)
    .map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
}

/**
 * Filter tool definitions: exclude integration tools whose platform is not authorized.
 */
export function getFilteredToolDefinitions(
  toolNames: string[],
  availablePlatforms: string[]
): string[] {
  return toolNames.filter((name) => {
    const tool = registry.get(name);
    if (!tool) return false;
    // If the tool requires an integration, check if that platform is available
    if (tool.requiresIntegration) {
      return availablePlatforms.includes(tool.requiresIntegration);
    }
    return true;
  });
}

// Side-effect requires — must use require to avoid hoisting before registry init
require('./web-search');
require('./web-scrape');
require('./on-chain');
require('./code-execute');
require('./github-read');

// Integration action tools
require('./discord-send');
require('./github-create-issue');
require('./telegram-send');
require('./slack-send');
require('./twitter-post');
require('./email-send');

// Power tools — real automation capabilities
require('./http-request');
require('./file-generate');
require('./smart-contract-read');
require('./github-write');
