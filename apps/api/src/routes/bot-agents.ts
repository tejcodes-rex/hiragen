import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createBotSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  skills: z.array(z.string()).min(1).max(20),
  systemPrompt: z.string().min(10).max(5000).optional(),
  llmProvider: z.enum(['gemini', 'groq']),
  llmModel: z.string().optional(),
  categories: z.array(z.string()).optional(),
  maxTaskReward: z.number().min(1).max(100000).optional(),
  maxTasksPerHour: z.number().min(1).max(50).optional(),
  hourlyRate: z.number().min(0).optional(),
  enabledTools: z.array(z.string()).optional(),
  agentType: z.enum(['INTERNAL_BOT', 'EXTERNAL_SDK', 'HUMAN']).optional(),
  rating: z.number().min(0).max(5).optional(),
  totalReviews: z.number().min(0).optional(),
  tasksCompleted: z.number().min(0).optional(),
  totalEarnings: z.number().min(0).optional(),
  successRate: z.number().min(0).max(100).optional(),
});

const updateBotSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  skills: z.array(z.string()).optional(),
  systemPrompt: z.string().max(5000).optional(),
  llmProvider: z.enum(['gemini', 'groq']).optional(),
  llmModel: z.string().optional(),
  categories: z.array(z.string()).optional(),
  maxTaskReward: z.number().min(1).max(100000).optional(),
  maxTasksPerHour: z.number().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  autoAccept: z.boolean().optional(),
  enabledTools: z.array(z.string()).optional(),
  agentType: z.enum(['INTERNAL_BOT', 'EXTERNAL_SDK', 'HUMAN']).optional(),
  rating: z.number().min(0).max(5).optional(),
  totalReviews: z.number().min(0).optional(),
  tasksCompleted: z.number().min(0).optional(),
  totalEarnings: z.number().min(0).optional(),
  successRate: z.number().min(0).max(100).optional(),
});

function parseBotAgent(agent: any) {
  if (!agent) return agent;
  return {
    ...agent,
    skills: typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills,
    categories: typeof agent.categories === 'string' ? JSON.parse(agent.categories) : agent.categories,
  };
}

// List all bot agents
router.get('/', async (req: AuthRequest, res: Response) => {
  const bots = await req.prisma.agent.findMany({
    where: { isBot: true },
    orderBy: { rating: 'desc' },
  });

  res.json({ success: true, data: bots.map(parseBotAgent) });
});

// Get single bot agent with stats
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({
    where: { id: req.params.id },
    include: {
      assignedTasks: {
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, category: true, reward: true, status: true, createdAt: true, updatedAt: true },
      },
    },
  });

  if (!agent || !agent.isBot) {
    return res.status(404).json({ success: false, error: 'Bot agent not found' });
  }

  res.json({ success: true, data: parseBotAgent(agent) });
});

// Create a bot agent
router.post('/', authenticate, validate(createBotSchema), async (req: AuthRequest, res: Response) => {
  const { name, description, skills, systemPrompt, llmProvider, llmModel, categories, maxTaskReward, maxTasksPerHour, hourlyRate, enabledTools, agentType, rating, totalReviews, tasksCompleted, totalEarnings, successRate } = req.body;

  // Create a system user for the bot
  const botEmail = `bot-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@hiragen.bot`;
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);

  const agent = await req.prisma.$transaction(async (tx: any) => {
    const botUser = await tx.user.create({
      data: {
        email: botEmail,
        passwordHash,
        name: `${name} (Bot)`,
        role: 'AGENT',
      },
    });

    return tx.agent.create({
      data: {
        userId: botUser.id,
        name,
        description,
        skills: JSON.stringify(skills),
        isBot: true,
        systemPrompt,
        llmProvider,
        llmModel,
        categories: JSON.stringify(categories || []),
        maxTaskReward: maxTaskReward || 500,
        maxTasksPerHour: maxTasksPerHour || 5,
        autoAccept: true,
        hourlyRate: hourlyRate || 0,
        enabledTools: enabledTools ? JSON.stringify(enabledTools) : undefined,
        agentType: agentType || 'INTERNAL_BOT',
        rating: rating || 0,
        totalReviews: totalReviews || 0,
        tasksCompleted: tasksCompleted || 0,
        totalEarnings: totalEarnings || 0,
        successRate: successRate || 100,
      },
    });
  });

  res.status(201).json({ success: true, data: parseBotAgent(agent) });
});

// Update bot agent
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent || !agent.isBot) {
    return res.status(404).json({ success: false, error: 'Bot agent not found' });
  }

  const { name, description, skills, systemPrompt, llmProvider, llmModel, categories, maxTaskReward, maxTasksPerHour, isActive, autoAccept, enabledTools, agentType, rating, totalReviews, tasksCompleted, totalEarnings, successRate } = req.body;

  const updated = await req.prisma.agent.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(description && { description }),
      ...(skills && { skills: JSON.stringify(skills) }),
      ...(systemPrompt !== undefined && { systemPrompt }),
      ...(llmProvider && { llmProvider }),
      ...(llmModel !== undefined && { llmModel }),
      ...(categories && { categories: JSON.stringify(categories) }),
      ...(maxTaskReward !== undefined && { maxTaskReward }),
      ...(maxTasksPerHour !== undefined && { maxTasksPerHour }),
      ...(isActive !== undefined && { isActive }),
      ...(autoAccept !== undefined && { autoAccept }),
      ...(enabledTools && { enabledTools: JSON.stringify(enabledTools) }),
      ...(agentType && { agentType }),
      ...(rating !== undefined && { rating }),
      ...(totalReviews !== undefined && { totalReviews }),
      ...(tasksCompleted !== undefined && { tasksCompleted }),
      ...(totalEarnings !== undefined && { totalEarnings }),
      ...(successRate !== undefined && { successRate }),
    },
  });

  res.json({ success: true, data: parseBotAgent(updated) });
});

// Toggle bot active/inactive
router.post('/:id/toggle', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent || !agent.isBot) {
    return res.status(404).json({ success: false, error: 'Bot agent not found' });
  }

  const updated = await req.prisma.agent.update({
    where: { id: req.params.id },
    data: { isActive: !agent.isActive },
  });

  res.json({ success: true, data: parseBotAgent(updated) });
});

// Delete bot agent
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const agent = await req.prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent || !agent.isBot) {
    return res.status(404).json({ success: false, error: 'Bot agent not found' });
  }

  // Soft delete — just deactivate
  await req.prisma.agent.update({
    where: { id: req.params.id },
    data: { isActive: false, autoAccept: false },
  });

  res.json({ success: true, message: 'Bot agent deactivated' });
});

export { router as botAgentRouter };
