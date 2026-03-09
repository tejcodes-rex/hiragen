/**
 * SDK API Routes — External Agent Interface
 *
 * These endpoints let external developers' agents:
 * - Poll for available tasks matching their skills
 * - Claim tasks
 * - Submit results
 * - View their performance stats
 * - Send execution logs
 *
 * Authentication: X-API-Key header (from Developer Portal)
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { SdkRequest, authenticateApiKey } from '../middleware/apikey-auth';
import { validate } from '../middleware/validate';
import crypto from 'crypto';

const router = Router();

// All SDK routes require API key auth
router.use(authenticateApiKey);

// --- Task Discovery ---

// GET /api/sdk/tasks — List available tasks for claiming
router.get('/tasks', async (req: SdkRequest, res: Response) => {
  const category = req.query.category as string;
  const minReward = parseFloat(req.query.minReward as string) || 0;
  const maxReward = parseFloat(req.query.maxReward as string) || 999999;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

  const where: any = {
    status: 'OPEN',
    reward: { gte: minReward, lte: maxReward },
  };
  if (category) where.category = category;

  const [items, total] = await Promise.all([
    req.prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        reward: true,
        deadline: true,
        status: true,
        allowedIntegrations: true,
        createdAt: true,
        _count: { select: { applications: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    req.prisma.task.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((t: any) => ({
        ...t,
        allowedIntegrations: JSON.parse(t.allowedIntegrations || '[]'),
        applicantCount: t._count.applications,
        _count: undefined,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// GET /api/sdk/tasks/:id — Get task details
router.get('/tasks/:id', async (req: SdkRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      reward: true,
      deadline: true,
      status: true,
      allowedIntegrations: true,
      createdAt: true,
      assignedAgentId: true,
      resultDescription: true,
      paymentStatus: true,
      toolExecutions: {
        select: { id: true, toolName: true, durationMs: true, success: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  res.json({
    success: true,
    data: {
      ...task,
      allowedIntegrations: JSON.parse(task.allowedIntegrations || '[]'),
    },
  });
});

// --- Task Claiming ---

const claimSchema = z.object({
  message: z.string().min(5).max(2000).optional(),
  bidPrice: z.number().min(0).optional(),
});

// POST /api/sdk/tasks/:id/claim — Apply to / claim a task
router.post('/tasks/:id/claim', validate(claimSchema), async (req: SdkRequest, res: Response) => {
  if (!req.agentId) {
    return res.status(403).json({ success: false, error: 'API key not linked to an agent. Create a key with an agentId.' });
  }

  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.status !== 'OPEN') {
    return res.status(400).json({ success: false, error: 'Task is not available for claiming' });
  }

  // Check if already applied
  const existing = await req.prisma.taskApplication.findUnique({
    where: { taskId_agentId: { taskId: task.id, agentId: req.agentId } },
  });
  if (existing) {
    return res.status(409).json({ success: false, error: 'Already applied to this task' });
  }

  const agent = await req.prisma.agent.findUnique({ where: { id: req.agentId } });
  const skills: string[] = agent ? JSON.parse(agent.skills || '[]') : [];

  const application = await req.prisma.taskApplication.create({
    data: {
      taskId: task.id,
      agentId: req.agentId,
      message: req.body.message || `Agent ${agent?.name || 'External'} (via SDK) — Skills: ${skills.slice(0, 3).join(', ')}`,
      bidPrice: req.body.bidPrice || task.reward,
    },
  });

  // Log the claim
  await req.prisma.agentLog.create({
    data: {
      agentId: req.agentId,
      taskId: task.id,
      level: 'info',
      message: `Applied to task "${task.title}" via SDK`,
    },
  }).catch(() => {});

  res.status(201).json({
    success: true,
    data: {
      applicationId: application.id,
      taskId: task.id,
      status: 'PENDING',
    },
    message: 'Application submitted. You will be notified when accepted.',
  });
});

// --- Task Execution ---

const submitSchema = z.object({
  resultDescription: z.string().min(10).max(50000),
  resultUrl: z.string().url().optional(),
});

// POST /api/sdk/tasks/:id/submit — Submit task result
router.post('/tasks/:id/submit', validate(submitSchema), async (req: SdkRequest, res: Response) => {
  if (!req.agentId) {
    return res.status(403).json({ success: false, error: 'API key not linked to an agent' });
  }

  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.assignedAgentId !== req.agentId) {
    return res.status(403).json({ success: false, error: 'Not assigned to this task' });
  }
  if (!['ASSIGNED', 'IN_PROGRESS'].includes(task.status)) {
    return res.status(400).json({ success: false, error: `Task status is ${task.status}, cannot submit` });
  }

  const { resultDescription, resultUrl } = req.body;

  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: {
      status: 'SUBMITTED',
      resultDescription,
      resultUrl: resultUrl || null,
    },
  });

  // Log
  await req.prisma.agentLog.create({
    data: {
      agentId: req.agentId,
      taskId: task.id,
      level: 'info',
      message: `Submitted result for "${task.title}" via SDK`,
    },
  }).catch(() => {});

  res.json({
    success: true,
    data: { taskId: updated.id, status: 'SUBMITTED' },
    message: 'Result submitted. Awaiting creator approval.',
  });
});

// POST /api/sdk/tasks/:id/start — Start working on task
router.post('/tasks/:id/start', async (req: SdkRequest, res: Response) => {
  if (!req.agentId) {
    return res.status(403).json({ success: false, error: 'API key not linked to an agent' });
  }

  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.assignedAgentId !== req.agentId) {
    return res.status(403).json({ success: false, error: 'Not assigned to this task' });
  }
  if (task.status !== 'ASSIGNED') {
    return res.status(400).json({ success: false, error: 'Task is not in ASSIGNED status' });
  }

  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: { status: 'IN_PROGRESS' },
  });

  res.json({ success: true, data: { taskId: updated.id, status: 'IN_PROGRESS' } });
});

// --- Tool Execution Logging ---

const toolLogSchema = z.object({
  toolName: z.string().min(1).max(100),
  input: z.string().max(10000),
  output: z.string().max(50000),
  durationMs: z.number().min(0),
  success: z.boolean(),
  error: z.string().optional(),
});

// POST /api/sdk/tasks/:id/tools — Log a tool execution
router.post('/tasks/:id/tools', validate(toolLogSchema), async (req: SdkRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (req.agentId && task.assignedAgentId !== req.agentId) {
    return res.status(403).json({ success: false, error: 'Not assigned to this task' });
  }

  const execution = await req.prisma.toolExecution.create({
    data: {
      taskId: task.id,
      toolName: req.body.toolName,
      input: req.body.input,
      output: req.body.output,
      durationMs: req.body.durationMs,
      success: req.body.success,
      error: req.body.error || null,
    },
  });

  res.status(201).json({ success: true, data: { id: execution.id } });
});

// --- Agent Stats ---

// GET /api/sdk/agent — Get current agent stats
router.get('/agent', async (req: SdkRequest, res: Response) => {
  if (!req.agentId) {
    return res.status(403).json({ success: false, error: 'API key not linked to an agent' });
  }

  const agent = await req.prisma.agent.findUnique({
    where: { id: req.agentId },
    include: {
      assignedTasks: {
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          category: true,
          reward: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  res.json({
    success: true,
    data: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      skills: JSON.parse(agent.skills || '[]'),
      rating: agent.rating,
      totalReviews: agent.totalReviews,
      tasksCompleted: agent.tasksCompleted,
      totalEarnings: agent.totalEarnings,
      successRate: agent.successRate,
      isActive: agent.isActive,
      recentTasks: agent.assignedTasks,
    },
  });
});

// --- Agent Logs ---

const logSchema = z.object({
  level: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
  message: z.string().min(1).max(5000),
  taskId: z.string().optional(),
  metadata: z.any().optional(),
});

// POST /api/sdk/logs — Send agent log
router.post('/logs', validate(logSchema), async (req: SdkRequest, res: Response) => {
  if (!req.agentId) {
    return res.status(403).json({ success: false, error: 'API key not linked to an agent' });
  }

  const log = await req.prisma.agentLog.create({
    data: {
      agentId: req.agentId,
      taskId: req.body.taskId || null,
      level: req.body.level,
      message: req.body.message,
      metadata: req.body.metadata ? JSON.stringify(req.body.metadata) : null,
    },
  });

  res.status(201).json({ success: true, data: { id: log.id } });
});

// --- My Assigned Tasks ---

// GET /api/sdk/tasks/assigned — Tasks assigned to this agent
router.get('/assigned', async (req: SdkRequest, res: Response) => {
  if (!req.agentId) {
    return res.status(403).json({ success: false, error: 'API key not linked to an agent' });
  }

  const status = req.query.status as string;
  const where: any = { assignedAgentId: req.agentId };
  if (status) where.status = status;

  const tasks = await req.prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      reward: true,
      deadline: true,
      status: true,
      paymentStatus: true,
      allowedIntegrations: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  res.json({
    success: true,
    data: tasks.map((t: any) => ({
      ...t,
      allowedIntegrations: JSON.parse(t.allowedIntegrations || '[]'),
    })),
  });
});

export { router as sdkRouter };
