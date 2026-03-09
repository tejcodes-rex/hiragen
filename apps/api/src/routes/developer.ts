/**
 * Developer Portal Routes
 * Manage API keys, webhooks, and agent registration for external developers
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generateApiKey } from '../middleware/apikey-auth';
import crypto from 'crypto';

const router = Router();

// --- API Key Management ---

const createKeySchema = z.object({
  label: z.string().min(1).max(100),
  agentId: z.string().optional(),
});

// List API keys
router.get('/keys', authenticate, async (req: AuthRequest, res: Response) => {
  const keys = await req.prisma.apiKey.findMany({
    where: { userId: req.userId },
    select: {
      id: true,
      key: true,
      label: true,
      agentId: true,
      permissions: true,
      lastUsedAt: true,
      isActive: true,
      createdAt: true,
      agent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Mask keys — only show last 8 chars
  const masked = keys.map((k: any) => ({
    ...k,
    key: k.key.slice(0, 4) + '...' + k.key.slice(-8),
  }));

  res.json({ success: true, data: masked });
});

// Create API key
router.post('/keys', authenticate, validate(createKeySchema), async (req: AuthRequest, res: Response) => {
  const { label, agentId } = req.body;

  // If agentId provided, verify ownership
  if (agentId) {
    const agent = await req.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.userId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Agent not found or not owned by you' });
    }
  }

  const key = generateApiKey();
  const apiKey = await req.prisma.apiKey.create({
    data: {
      userId: req.userId!,
      key,
      label,
      agentId: agentId || null,
      permissions: JSON.stringify(['tasks.read', 'tasks.claim', 'tasks.submit', 'agent.stats']),
    },
  });

  // Return the FULL key only on creation — never shown again
  res.status(201).json({
    success: true,
    data: { id: apiKey.id, key, label: apiKey.label, agentId: apiKey.agentId },
    message: 'Save this key now. It will not be shown again.',
  });
});

// Revoke API key
router.delete('/keys/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const key = await req.prisma.apiKey.findUnique({ where: { id: req.params.id } });
  if (!key || key.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  await req.prisma.apiKey.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ success: true, message: 'API key revoked' });
});

// --- Webhook Management ---

const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  agentId: z.string().optional(),
});

// List webhooks
router.get('/webhooks', authenticate, async (req: AuthRequest, res: Response) => {
  const webhooks = await req.prisma.webhook.findMany({
    where: { userId: req.userId },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      lastError: true,
      agentId: true,
      createdAt: true,
      agent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: webhooks.map((w: any) => ({
      ...w,
      events: JSON.parse(w.events),
    })),
  });
});

// Create webhook
router.post('/webhooks', authenticate, validate(webhookSchema), async (req: AuthRequest, res: Response) => {
  const { url, events, agentId } = req.body;
  const secret = crypto.randomBytes(32).toString('hex');

  const webhook = await req.prisma.webhook.create({
    data: {
      userId: req.userId!,
      url,
      events: JSON.stringify(events),
      secret,
      agentId: agentId || null,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      id: webhook.id,
      url: webhook.url,
      events,
      secret,
    },
    message: 'Save the signing secret. It will not be shown again.',
  });
});

// Delete webhook
router.delete('/webhooks/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const wh = await req.prisma.webhook.findUnique({ where: { id: req.params.id } });
  if (!wh || wh.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  await req.prisma.webhook.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Webhook deleted' });
});

// --- Agent Registration for External Developers ---

const registerExternalAgentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(20).max(2000),
  skills: z.array(z.string()).min(1).max(20),
  categories: z.array(z.string()).optional(),
  hourlyRate: z.number().min(0).optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  webhookUrl: z.string().url().optional(),
});

// Register an external agent (creates agent + API key in one step)
router.post('/agents', authenticate, validate(registerExternalAgentSchema), async (req: AuthRequest, res: Response) => {
  const { name, description, skills, categories, hourlyRate, walletAddress, webhookUrl } = req.body;

  const existing = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (existing) {
    return res.status(409).json({ success: false, error: 'Agent profile already exists. Use your existing agent.' });
  }

  const apiKeyValue = generateApiKey();

  const result = await req.prisma.$transaction(async (tx: any) => {
    // Update user role
    await tx.user.update({
      where: { id: req.userId },
      data: { role: 'AGENT', ...(walletAddress && { walletAddress }) },
    });

    // Create agent
    const agent = await tx.agent.create({
      data: {
        userId: req.userId!,
        name,
        description,
        skills: JSON.stringify(skills),
        categories: JSON.stringify(categories || []),
        hourlyRate: hourlyRate || 0,
        walletAddress: walletAddress || null,
        agentType: 'EXTERNAL_SDK',
        isBot: false,
        autoAccept: false,
      },
    });

    // Create API key linked to agent
    const apiKey = await tx.apiKey.create({
      data: {
        userId: req.userId!,
        key: apiKeyValue,
        label: `${name} SDK Key`,
        agentId: agent.id,
        permissions: JSON.stringify(['tasks.read', 'tasks.claim', 'tasks.submit', 'agent.stats']),
      },
    });

    // Create webhook if URL provided
    let webhook = null;
    if (webhookUrl) {
      const secret = crypto.randomBytes(32).toString('hex');
      webhook = await tx.webhook.create({
        data: {
          userId: req.userId!,
          url: webhookUrl,
          events: JSON.stringify(['task.new', 'task.assigned', 'task.completed']),
          secret,
          agentId: agent.id,
        },
      });
      webhook.secret = secret; // Include for response
    }

    return { agent, apiKey, webhook };
  });

  res.status(201).json({
    success: true,
    data: {
      agent: {
        id: result.agent.id,
        name: result.agent.name,
        skills: JSON.parse(result.agent.skills),
      },
      apiKey: apiKeyValue,
      webhook: result.webhook ? {
        id: result.webhook.id,
        url: result.webhook.url,
        secret: result.webhook.secret,
      } : null,
    },
    message: 'Agent registered. Save your API key — it will not be shown again.',
  });
});

// --- Agent Logs (monitoring) ---

router.get('/logs', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent) {
    return res.status(404).json({ success: false, error: 'No agent profile found' });
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
  const level = req.query.level as string;

  const where: any = { agentId: agent.id };
  if (level) where.level = level;

  const [items, total] = await Promise.all([
    req.prisma.agentLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        task: { select: { id: true, title: true, status: true } },
      },
    }),
    req.prisma.agentLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
});

// --- Developer Stats ---

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent) {
    return res.status(404).json({ success: false, error: 'No agent profile found' });
  }

  const [totalTasks, activeTasks, completedTasks, totalToolExecutions, recentLogs] = await Promise.all([
    req.prisma.task.count({ where: { assignedAgentId: agent.id } }),
    req.prisma.task.count({
      where: { assignedAgentId: agent.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    }),
    req.prisma.task.count({ where: { assignedAgentId: agent.id, status: 'COMPLETED' } }),
    req.prisma.toolExecution.count({ where: { task: { assignedAgentId: agent.id } } }),
    req.prisma.agentLog.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  res.json({
    success: true,
    data: {
      agent: {
        id: agent.id,
        name: agent.name,
        rating: agent.rating,
        totalEarnings: agent.totalEarnings,
        tasksCompleted: agent.tasksCompleted,
        successRate: agent.successRate,
      },
      totalTasks,
      activeTasks,
      completedTasks,
      totalToolExecutions,
      recentLogs,
    },
  });
});

export { router as developerRouter };
