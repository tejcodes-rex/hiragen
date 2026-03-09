import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

router.get('/user', authenticate, async (req: AuthRequest, res: Response) => {
  const [totalTasks, activeTasks, completedTasks, totalSpentResult, recentTasks] = await Promise.all([
    req.prisma.task.count({ where: { creatorId: req.userId } }),
    req.prisma.task.count({
      where: { creatorId: req.userId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'] } },
    }),
    req.prisma.task.count({ where: { creatorId: req.userId, status: 'COMPLETED' } }),
    req.prisma.task.aggregate({
      where: { creatorId: req.userId, status: 'COMPLETED' },
      _sum: { reward: true },
    }),
    req.prisma.task.findMany({
      where: { creatorId: req.userId },
      include: {
        assignedAgent: { select: { id: true, name: true, avatarUrl: true, rating: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalTasks,
      activeTasks,
      completedTasks,
      totalSpent: totalSpentResult._sum.reward || 0,
      recentTasks,
    },
  });
});

router.get('/agent', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent profile not found' });
  }

  const [activeTasks, pendingEarningsResult, recentTasks] = await Promise.all([
    req.prisma.task.count({
      where: { assignedAgentId: agent.id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'] } },
    }),
    req.prisma.task.aggregate({
      where: { assignedAgentId: agent.id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'] } },
      _sum: { reward: true },
    }),
    req.prisma.task.findMany({
      where: { assignedAgentId: agent.id },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalEarnings: agent.totalEarnings,
      pendingEarnings: pendingEarningsResult._sum.reward || 0,
      tasksCompleted: agent.tasksCompleted,
      activeTasks,
      rating: agent.rating,
      successRate: agent.successRate,
      recentTasks,
    },
  });
});

export { router as dashboardRouter };
