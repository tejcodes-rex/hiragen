import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const VALID_PLATFORMS = ['discord', 'github', 'telegram', 'slack', 'twitter', 'email'] as const;

const createTaskSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  category: z.enum([
    'ON_CHAIN_ANALYTICS', 'GITHUB_AUTOMATION', 'SOCIAL_MEDIA_AUTOMATION',
    'EMAIL_AUTOMATION', 'WORKFLOW_AUTOMATION', 'CONTENT_WRITING',
    'DATA_ANALYSIS', 'WEB_DEVELOPMENT', 'MARKETING', 'DATA_SCRAPING',
    'BLOCKCHAIN', 'DESIGN', 'AUTOMATION', 'SMART_CONTRACT_AUDIT',
    'API_INTEGRATION', 'DEVOPS', 'SECURITY_ANALYSIS', 'OTHER',
  ]),
  reward: z.number().min(1).max(100000),
  deadline: z.string().refine(d => new Date(d) > new Date(), 'Deadline must be in the future'),
  allowedIntegrations: z.array(z.enum(VALID_PLATFORMS)).optional(),
});

const submitResultSchema = z.object({
  resultDescription: z.string().min(10).max(5000),
  resultUrl: z.string().url().optional(),
});

// List tasks
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 12));
  const search = (req.query.search as string) || '';
  const category = req.query.category as string;
  const status = req.query.status as string;
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (category) where.category = category;
  if (status) where.status = status;
  if (req.query.mine === 'true' && req.userId) where.creatorId = req.userId;

  const [items, total] = await Promise.all([
    req.prisma.task.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignedAgent: { select: { id: true, name: true, avatarUrl: true, rating: true } },
        _count: { select: { applications: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    req.prisma.task.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
});

// Get single task
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true, walletAddress: true } },
      assignedAgent: {
        select: { id: true, userId: true, name: true, avatarUrl: true, rating: true, skills: true, walletAddress: true },
      },
      reviews: { include: { reviewer: { select: { id: true, name: true } } } },
      applications: {
        include: {
          agent: { select: { id: true, name: true, avatarUrl: true, rating: true, skills: true, tasksCompleted: true, successRate: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  // Parse agent skills from JSON string
  if (task.assignedAgent && typeof task.assignedAgent.skills === 'string') {
    (task.assignedAgent as any).skills = JSON.parse(task.assignedAgent.skills);
  }
  for (const app of task.applications) {
    if (app.agent && typeof app.agent.skills === 'string') {
      (app.agent as any).skills = JSON.parse(app.agent.skills);
    }
  }
  res.json({ success: true, data: task });
});

// Create task
router.post('/', authenticate, validate(createTaskSchema), async (req: AuthRequest, res: Response) => {
  const { title, description, category, reward, deadline, allowedIntegrations } = req.body;

  // Validate user has the requested integrations configured
  if (allowedIntegrations && allowedIntegrations.length > 0) {
    const configured = await req.prisma.userIntegration.findMany({
      where: { userId: req.userId!, platform: { in: allowedIntegrations } },
      select: { platform: true },
    });
    const configuredPlatforms = configured.map((i: any) => i.platform);
    const missing = allowedIntegrations.filter((p: string) => !configuredPlatforms.includes(p));
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Integrations not configured: ${missing.join(', ')}. Set them up in Settings first.`,
      });
    }
  }

  const task = await req.prisma.task.create({
    data: {
      title, description, category, reward,
      deadline: new Date(deadline),
      creatorId: req.userId!,
      allowedIntegrations: allowedIntegrations ? JSON.stringify(allowedIntegrations) : '[]',
    },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Fire webhook for new task
  const app = req.app;
  const webhookService = app.get('webhookService');
  if (webhookService) {
    webhookService.fire('task.new', {
      taskId: task.id,
      title: task.title,
      category: task.category,
      reward: task.reward,
      deadline: task.deadline,
    }).catch(() => {});
  }

  res.status(201).json({ success: true, data: task });
});

// Accept task
router.post('/:id/accept', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent) {
    return res.status(403).json({ success: false, error: 'Only agents can accept tasks' });
  }

  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.status !== 'OPEN') {
    return res.status(400).json({ success: false, error: 'Task is not available' });
  }

  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: { status: 'ASSIGNED', assignedAgentId: agent.id },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      assignedAgent: { select: { id: true, name: true, avatarUrl: true, rating: true } },
    },
  });
  res.json({ success: true, data: updated });
});

// Start task
router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent) return res.status(403).json({ success: false, error: 'Only agents can start tasks' });

  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || task.assignedAgentId !== agent.id) {
    return res.status(403).json({ success: false, error: 'Not assigned to this task' });
  }
  if (task.status !== 'ASSIGNED') {
    return res.status(400).json({ success: false, error: 'Task cannot be started' });
  }

  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: { status: 'IN_PROGRESS' },
  });
  res.json({ success: true, data: updated });
});

// Submit result
router.post('/:id/submit', authenticate, validate(submitResultSchema), async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent) return res.status(403).json({ success: false, error: 'Only agents can submit results' });

  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || task.assignedAgentId !== agent.id) {
    return res.status(403).json({ success: false, error: 'Not assigned to this task' });
  }
  if (task.status !== 'IN_PROGRESS' && task.status !== 'ASSIGNED') {
    return res.status(400).json({ success: false, error: 'Task is not in progress' });
  }

  const { resultDescription, resultUrl } = req.body;
  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: { status: 'SUBMITTED', resultDescription, resultUrl },
  });
  res.json({ success: true, data: updated });
});

// Approve task
router.post('/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({
    where: { id: req.params.id },
    include: { assignedAgent: true },
  });

  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.creatorId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Only the task creator can approve' });
  }
  if (task.status !== 'SUBMITTED') {
    return res.status(400).json({ success: false, error: 'Task has not been submitted' });
  }

  const updated = await req.prisma.$transaction(async (tx: any) => {
    const updatedTask = await tx.task.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', paymentStatus: 'RELEASED' },
    });

    if (task.assignedAgent) {
      await tx.agent.update({
        where: { id: task.assignedAgent.id },
        data: {
          tasksCompleted: { increment: 1 },
          totalEarnings: { increment: task.reward },
        },
      });
    }

    return updatedTask;
  });
  res.json({ success: true, data: updated });
});

// Cancel task
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.creatorId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Only the task creator can cancel' });
  }
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
    return res.status(400).json({ success: false, error: 'Task cannot be cancelled' });
  }

  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
  });
  res.json({ success: true, data: updated });
});

// Assign agent to task (by task creator)
router.post('/:id/assign/:agentId', authenticate, async (req: AuthRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.creatorId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Only the task creator can assign agents' });
  }
  if (task.status !== 'OPEN') {
    return res.status(400).json({ success: false, error: 'Task is not available for assignment' });
  }

  const agent = await req.prisma.agent.findUnique({ where: { id: req.params.agentId } });
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: { status: 'ASSIGNED', assignedAgentId: agent.id },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      assignedAgent: { select: { id: true, name: true, avatarUrl: true, rating: true } },
    },
  });
  res.json({ success: true, data: updated });
});

// Update escrow tx hash
router.put('/:id/escrow', authenticate, async (req: AuthRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.creatorId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const { escrowTxHash } = req.body;
  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: { escrowTxHash, paymentStatus: 'ESCROWED' },
  });
  res.json({ success: true, data: updated });
});

// Update release tx hash
router.put('/:id/release', authenticate, async (req: AuthRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.creatorId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const { releaseTxHash } = req.body;
  const updated = await req.prisma.task.update({
    where: { id: req.params.id },
    data: { releaseTxHash },
  });
  res.json({ success: true, data: updated });
});

export { router as taskRouter };
