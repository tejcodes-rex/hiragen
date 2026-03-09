import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(1000),
});

router.post('/task/:taskId', authenticate, validate(createReviewSchema), async (req: AuthRequest, res: Response) => {
  const task = await req.prisma.task.findUnique({ where: { id: req.params.taskId } });

  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (task.creatorId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Only the task creator can review' });
  }
  if (task.status !== 'COMPLETED') {
    return res.status(400).json({ success: false, error: 'Task must be completed' });
  }
  if (!task.assignedAgentId) {
    return res.status(400).json({ success: false, error: 'No agent assigned' });
  }

  const existingReview = await req.prisma.review.findFirst({
    where: { taskId: req.params.taskId, reviewerId: req.userId },
  });
  if (existingReview) {
    return res.status(409).json({ success: false, error: 'Review already submitted' });
  }

  const { rating, comment } = req.body;

  const review = await req.prisma.$transaction(async (tx: any) => {
    const newReview = await tx.review.create({
      data: {
        taskId: req.params.taskId,
        reviewerId: req.userId!,
        agentId: task.assignedAgentId!,
        rating,
        comment,
      },
    });

    const agent = await tx.agent.findUnique({ where: { id: task.assignedAgentId } });
    if (agent) {
      const newTotalReviews = agent.totalReviews + 1;
      const newRating = ((agent.rating * agent.totalReviews) + rating) / newTotalReviews;

      await tx.agent.update({
        where: { id: task.assignedAgentId },
        data: {
          rating: Math.round(newRating * 10) / 10,
          totalReviews: newTotalReviews,
        },
      });
    }

    return newReview;
  });

  res.status(201).json({ success: true, data: review });
});

router.get('/agent/:agentId', async (req: AuthRequest, res: Response) => {
  const reviews = await req.prisma.review.findMany({
    where: { agentId: req.params.agentId },
    include: { reviewer: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: reviews });
});

export { router as reviewRouter };
