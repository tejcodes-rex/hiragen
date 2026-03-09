import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createAgentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(20).max(2000),
  skills: z.array(z.string()).min(1).max(20),
  hourlyRate: z.number().min(0).max(10000),
});

// Parse skills JSON string to array for API responses
function parseAgent(agent: any) {
  if (!agent) return agent;
  return {
    ...agent,
    skills: typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills,
  };
}

function parseAgents(agents: any[]) {
  return agents.map(parseAgent);
}

// List agents
router.get('/', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 12));
  const search = (req.query.search as string) || '';
  const typeFilter = (req.query.type as string) || '';

  const where: any = { isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (typeFilter && ['INTERNAL_BOT', 'EXTERNAL_SDK', 'HUMAN'].includes(typeFilter)) {
    where.agentType = typeFilter;
  }

  const [items, total] = await Promise.all([
    req.prisma.agent.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { rating: 'desc' },
    }),
    req.prisma.agent.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items: parseAgents(items), total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
});

// Get single agent
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const [agent, totalApplications, acceptedApplications] = await Promise.all([
    req.prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTasks: {
          where: { status: 'COMPLETED' },
          take: 5,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, category: true, reward: true, status: true, createdAt: true },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { name: true } } },
        },
      },
    }),
    req.prisma.taskApplication.count({ where: { agentId: req.params.id } }),
    req.prisma.taskApplication.count({ where: { agentId: req.params.id, status: 'ACCEPTED' } }),
  ]);

  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  const parsed = parseAgent(agent);
  parsed.applicationStats = { total: totalApplications, accepted: acceptedApplications };
  res.json({ success: true, data: parsed });
});

// Register as agent
router.post('/', authenticate, validate(createAgentSchema), async (req: AuthRequest, res: Response) => {
  const existing = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (existing) {
    return res.status(409).json({ success: false, error: 'Agent profile already exists' });
  }

  const { name, description, skills, hourlyRate } = req.body;

  const agent = await req.prisma.$transaction(async (tx: any) => {
    await tx.user.update({
      where: { id: req.userId },
      data: { role: 'AGENT' },
    });

    return tx.agent.create({
      data: { userId: req.userId!, name, description, skills: JSON.stringify(skills), hourlyRate },
    });
  });

  res.status(201).json({ success: true, data: parseAgent(agent) });
});

// Update agent
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent || agent.userId !== req.userId) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  const { name, description, skills, hourlyRate, isActive, walletAddress } = req.body;
  const updated = await req.prisma.agent.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(description && { description }),
      ...(skills && { skills: JSON.stringify(skills) }),
      ...(hourlyRate !== undefined && { hourlyRate }),
      ...(isActive !== undefined && { isActive }),
      ...(walletAddress !== undefined && { walletAddress: walletAddress || null }),
    },
  });

  res.json({ success: true, data: parseAgent(updated) });
});

export { router as agentRouter };
