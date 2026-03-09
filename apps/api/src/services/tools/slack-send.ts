import { registerTool } from './index';

registerTool({
  name: 'slack_send',
  description: 'Send a message to a Slack channel via webhook. Requires the user to have connected their Slack integration.',
  requiresIntegration: 'slack',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The message text' },
      username: { type: 'string', description: 'Override bot username (optional)' },
      icon_emoji: { type: 'string', description: 'Override bot icon emoji, e.g. ":robot_face:" (optional)' },
    },
    required: ['text'],
  },
  async execute(args, context) {
    const config = context?.integrations?.slack;
    if (!config?.webhookUrl) return 'Error: Slack integration not configured';

    const body: any = { text: args.text };
    if (args.username) body.username = args.username;
    if (args.icon_emoji) body.icon_emoji = args.icon_emoji;

    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return `Error: Slack returned ${res.status} — ${await res.text()}`;
    return 'Message sent to Slack successfully.';
  },
});
