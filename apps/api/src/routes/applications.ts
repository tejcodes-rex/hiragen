import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router({ mergeParams: true });

const applySchema = z.object({
  message: z.string().min(10).max(2000),
  bidPrice: z.number().min(0).optional(),
});

// POST /api/tasks/:taskId/applications — Apply to a task
router.post('/', authenticate, validate(applySchema), async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const { message, bidPrice } = req.body;

  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent) {
    return res.status(403).json({ success: false, error: 'Only agents can apply to tasks' });
  }

  const task = await req.prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.status !== 'OPEN') {
    return res.status(400).json({ success: false, error: 'Task is not open for applications' });
  }
  if (task.creatorId === req.userId) {
    return res.status(400).json({ success: false, error: 'Cannot apply to your own task' });
  }

  const existing = await req.prisma.taskApplication.findUnique({
    where: { taskId_agentId: { taskId, agentId: agent.id } },
  });
  if (existing) {
    return res.status(409).json({ success: false, error: 'Already applied to this task' });
  }

  const application = await req.prisma.taskApplication.create({
    data: { taskId, agentId: agent.id, message, bidPrice },
    include: {
      agent: { select: { id: true, name: true, avatarUrl: true, rating: true, skills: true, tasksCompleted: true, successRate: true } },
    },
  });

  if (application.agent && typeof application.agent.skills === 'string') {
    (application.agent as any).skills = JSON.parse(application.agent.skills);
  }

  res.status(201).json({ success: true, data: application });
});

// GET /api/tasks/:taskId/applications — List applications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;

  const task = await req.prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  const isCreator = task.creatorId === req.userId;

  if (!isCreator && !agent) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const where: any = { taskId };
  // Non-creator agents can only see their own application
  if (!isCreator && agent) {
    where.agentId = agent.id;
  }

  const applications = await req.prisma.taskApplication.findMany({
    where,
    include: {
      agent: { select: { id: true, name: true, avatarUrl: true, rating: true, skills: true, tasksCompleted: true, successRate: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const app of applications) {
    if (app.agent && typeof app.agent.skills === 'string') {
      (app.agent as any).skills = JSON.parse(app.agent.skills);
    }
  }

  res.json({ success: true, data: applications });
});

// POST /api/tasks/:taskId/applications/:appId/accept — Accept an application
router.post('/:appId/accept', authenticate, async (req: AuthRequest, res: Response) => {
  const { taskId, appId } = req.params;

  const task = await req.prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.creatorId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Only the task creator can accept applications' });
  }
  if (task.status !== 'OPEN') {
    return res.status(400).json({ success: false, error: 'Task is not open' });
  }

  const application = await req.prisma.taskApplication.findUnique({ where: { id: appId } });
  if (!application || application.taskId !== taskId) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }
  if (application.status !== 'PENDING') {
    return res.status(400).json({ success: false, error: 'Application is not pending' });
  }

  const result = await req.prisma.$transaction(async (tx: any) => {
    // Accept this application
    await tx.taskApplication.update({
      where: { id: appId },
      data: { status: 'ACCEPTED' },
    });

    // Reject all other pending applications
    await tx.taskApplication.updateMany({
      where: { taskId, id: { not: appId }, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });

    // Assign the task
    return tx.task.update({
      where: { id: taskId },
      data: { status: 'ASSIGNED', assignedAgentId: application.agentId },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignedAgent: { select: { id: true, name: true, avatarUrl: true, rating: true, walletAddress: true } },
      },
    });
  });

  res.json({ success: true, data: result });
});

// POST /api/tasks/:taskId/applications/:appId/reject — Reject an application
router.post('/:appId/reject', authenticate, async (req: AuthRequest, res: Response) => {
  const { taskId, appId } = req.params;

  const task = await req.prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.creatorId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Only the task creator can reject applications' });
  }

  const application = await req.prisma.taskApplication.findUnique({ where: { id: appId } });
  if (!application || application.taskId !== taskId) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }
  if (application.status !== 'PENDING') {
    return res.status(400).json({ success: false, error: 'Application is not pending' });
  }

  await req.prisma.taskApplication.update({
    where: { id: appId },
    data: { status: 'REJECTED' },
  });

  res.json({ success: true, data: { message: 'Application rejected' } });
});

// DELETE /api/tasks/:taskId/applications — Withdraw own application
router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;

  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent) {
    return res.status(403).json({ success: false, error: 'Only agents can withdraw applications' });
  }

  const application = await req.prisma.taskApplication.findUnique({
    where: { taskId_agentId: { taskId, agentId: agent.id } },
  });
  if (!application) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }
  if (application.status !== 'PENDING') {
    return res.status(400).json({ success: false, error: 'Can only withdraw pending applications' });
  }

  await req.prisma.taskApplication.delete({ where: { id: application.id } });

  res.json({ success: true, data: { message: 'Application withdrawn' } });
});

export { router as applicationRouter };
