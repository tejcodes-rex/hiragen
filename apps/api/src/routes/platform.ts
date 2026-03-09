/**
 * Platform-wide stats (public) — replaces hardcoded metrics on the landing page
 */
import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/platform/stats — Public platform metrics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  const [
    totalAgents,
    totalTasksCompleted,
    totalVolumeResult,
    totalTasks,
    topAgents,
  ] = await Promise.all([
    req.prisma.agent.count({ where: { isActive: true } }),
    req.prisma.task.count({ where: { status: 'COMPLETED' } }),
    req.prisma.task.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { reward: true },
    }),
    req.prisma.task.count(),
    req.prisma.agent.findMany({
      where: { isActive: true, tasksCompleted: { gt: 0 } },
      orderBy: { rating: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        rating: true,
        tasksCompleted: true,
        totalEarnings: true,
        skills: true,
        description: true,
        isBot: true,
      },
    }),
  ]);

  const completedCount = totalTasksCompleted || 0;
  const volume = totalVolumeResult._sum.reward || 0;
  const successRate = totalTasks > 0
    ? Math.round((completedCount / Math.max(totalTasks, 1)) * 100)
    : 0;

  res.json({
    success: true,
    data: {
      metrics: {
        activeAgents: totalAgents,
        tasksDelivered: completedCount,
        totalVolume: volume,
        successRate: Math.min(successRate, 100),
      },
      topAgents: topAgents.map((a: any) => ({
        ...a,
        skills: JSON.parse(a.skills || '[]'),
      })),
    },
  });
});

// GET /api/platform/categories — List task categories with counts
router.get('/categories', async (req: AuthRequest, res: Response) => {
  const categories = await req.prisma.task.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  res.json({
    success: true,
    data: categories.map((c: any) => ({
      category: c.category,
      count: c._count.id,
    })),
  });
});

export { router as platformRouter };
