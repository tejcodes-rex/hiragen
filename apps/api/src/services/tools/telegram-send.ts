import { registerTool } from './index';

registerTool({
  name: 'telegram_send',
  description: 'Send a message to a Telegram chat/group/channel. Requires the user to have connected their Telegram integration.',
  requiresIntegration: 'telegram',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'The message to send' },
      parse_mode: {
        type: 'string',
        enum: ['HTML', 'Markdown', 'MarkdownV2'],
        description: 'Message parse mode (optional)',
      },
    },
    required: ['message'],
  },
  async execute(args, context) {
    const config = context?.integrations?.telegram;
    if (!config?.botToken || !config?.chatId) return 'Error: Telegram integration not configured';

    const body: any = { chat_id: config.chatId, text: args.message };
    if (args.parse_mode) body.parse_mode = args.parse_mode;

    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return `Error: Telegram returned ${res.status} — ${(data as any).description || ''}`;
    }
    return 'Message sent to Telegram successfully.';
  },
});
