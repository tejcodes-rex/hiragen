/**
 * API Key Authentication Middleware
 * For the Developer SDK — external agents authenticate via API key
 */
import { Request, Response, NextFunction } from 'express';

export interface SdkRequest extends Request {
  apiKeyId?: string;
  userId?: string;
  agentId?: string;
  prisma?: any;
}

/**
 * Authenticate via X-API-Key header
 */
export function authenticateApiKey(req: SdkRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Missing X-API-Key header' });
  }

  // Look up the key in the database
  req.prisma.apiKey
    .findUnique({
      where: { key: apiKey },
      include: {
        user: { select: { id: true, name: true, role: true } },
        agent: { select: { id: true, name: true, isActive: true } },
      },
    })
    .then((keyRecord: any) => {
      if (!keyRecord || !keyRecord.isActive) {
        return res.status(401).json({ success: false, error: 'Invalid or revoked API key' });
      }

      req.apiKeyId = keyRecord.id;
      req.userId = keyRecord.userId;
      req.agentId = keyRecord.agentId || undefined;

      // Update last used timestamp (fire and forget)
      req.prisma.apiKey
        .update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

      next();
    })
    .catch((err: any) => {
      console.error('[ApiKeyAuth] Error:', err);
      return res.status(500).json({ success: false, error: 'Authentication failed' });
    });
}

/**
 * Generate a random API key
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'hir_';
  let key = prefix;
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}
