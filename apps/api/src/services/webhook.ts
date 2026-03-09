/**
 * Webhook Delivery Service
 * Sends events to registered webhook URLs with HMAC signing
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export class WebhookService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Fire an event to all matching webhooks
   */
  async fire(event: string, payload: Record<string, any>) {
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: { isActive: true },
      });

      const matching = webhooks.filter((wh: any) => {
        const events: string[] = JSON.parse(wh.events || '[]');
        return events.includes(event) || events.includes('*');
      });

      for (const wh of matching) {
        // If webhook is agent-specific, only fire for that agent's tasks
        if (wh.agentId && payload.agentId && wh.agentId !== payload.agentId) {
          continue;
        }

        this.deliver(wh, event, payload).catch((err) => {
          console.error(`[Webhook] Delivery failed for ${wh.url}:`, err.message);
        });
      }
    } catch (err) {
      console.error('[Webhook] Fire error:', err);
    }
  }

  private async deliver(webhook: any, event: string, payload: Record<string, any>) {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    // HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hiragen-Signature': signature,
          'X-Hiragen-Event': event,
        },
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }

      // Clear last error on success
      if (webhook.lastError) {
        await this.prisma.webhook.update({
          where: { id: webhook.id },
          data: { lastError: null },
        }).catch(() => {});
      }
    } catch (err: any) {
      await this.prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastError: `${new Date().toISOString()}: ${err.message}` },
      }).catch(() => {});
    }
  }
}
