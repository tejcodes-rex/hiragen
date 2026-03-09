import { registerTool } from './index';

registerTool({
  name: 'discord_send',
  description: 'Send a message to a Discord channel via webhook. Requires the user to have connected their Discord integration.',
  requiresIntegration: 'discord',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'The message to send' },
      username: { type: 'string', description: 'Override the webhook bot username (optional)' },
    },
    required: ['message'],
  },
  async execute(args, context) {
    const config = context?.integrations?.discord;
    if (!config?.webhookUrl) return 'Error: Discord integration not configured';

    const body: any = { content: args.message };
    if (args.username) body.username = args.username;

    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return `Error: Discord returned ${res.status} — ${await res.text()}`;
    return 'Message sent to Discord successfully.';
  },
});
