import nodemailer from 'nodemailer';
import { registerTool } from './index';

registerTool({
  name: 'email_send',
  description: 'Send an email via SMTP. Requires the user to have connected their Email integration.',
  requiresIntegration: 'email',
  parameters: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email address' },
      subject: { type: 'string', description: 'Email subject' },
      body: { type: 'string', description: 'Plain text body' },
      html: { type: 'string', description: 'HTML body (optional, overrides plain text)' },
    },
    required: ['to', 'subject', 'body'],
  },
  async execute(args, context) {
    const config = context?.integrations?.email;
    if (!config?.host || !config?.user) return 'Error: Email integration not configured';

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });

    const info = await transporter.sendMail({
      from: config.from || config.user,
      to: args.to,
      subject: args.subject,
      text: args.body,
      html: args.html || undefined,
    });

    return `Email sent to ${args.to} (messageId: ${info.messageId})`;
  },
});
