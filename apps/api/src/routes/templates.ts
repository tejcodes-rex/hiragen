/**
 * Task Templates — Pre-built task types with real automation value.
 * These are NOT free LLM tasks. Each template produces verifiable deliverables.
 */
import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// GET /api/templates — List all active templates
router.get('/', async (req: AuthRequest, res: Response) => {
  const templates = await req.prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: { usageCount: 'desc' },
  });

  res.json({
    success: true,
    data: templates.map((t: any) => ({
      ...t,
      requiredTools: JSON.parse(t.requiredTools || '[]'),
      deliverableTypes: JSON.parse(t.deliverableTypes || '[]'),
    })),
  });
});

// GET /api/templates/:id — Get single template
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const template = await req.prisma.taskTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

  res.json({
    success: true,
    data: {
      ...template,
      requiredTools: JSON.parse(template.requiredTools || '[]'),
      deliverableTypes: JSON.parse(template.deliverableTypes || '[]'),
    },
  });
});

// POST /api/templates/:id/use — Create a task from template
router.post('/:id/use', authenticate, async (req: AuthRequest, res: Response) => {
  const template = await req.prisma.taskTemplate.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

  const { title, description, reward, deadline, allowedIntegrations } = req.body;

  const task = await req.prisma.task.create({
    data: {
      title: title || template.name,
      description: description || template.taskDescription,
      category: template.category,
      reward: reward || template.suggestedReward,
      deadline: new Date(deadline || Date.now() + 7 * 24 * 60 * 60 * 1000),
      creatorId: req.userId!,
      templateId: template.id,
      allowedIntegrations: JSON.stringify(allowedIntegrations || []),
    },
  });

  // Increment usage count
  await req.prisma.taskTemplate.update({
    where: { id: template.id },
    data: { usageCount: { increment: 1 } },
  });

  res.status(201).json({ success: true, data: task });
});

export { router as templateRouter };
