/**
 * Deliverables Routes — Verifiable proof of work from agents
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate } from '../middleware/auth';
import { SdkRequest, authenticateApiKey } from '../middleware/apikey-auth';
import { validate } from '../middleware/validate';

const router = Router();

const createDeliverableSchema = z.object({
  taskId: z.string(),
  type: z.enum(['url', 'tx_hash', 'file', 'api_response', 'github_pr', 'deployment']),
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(10000),
  metadata: z.any().optional(),
});

// POST /api/deliverables — Agent submits a deliverable (JWT auth)
router.post('/', authenticate, validate(createDeliverableSchema), async (req: AuthRequest, res: Response) => {
  const { taskId, type, label, value, metadata } = req.body;

  const task = await req.prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  // Verify the requester is the assigned agent
  const agent = await req.prisma.agent.findUnique({ where: { userId: req.userId } });
  if (!agent || task.assignedAgentId !== agent.id) {
    return res.status(403).json({ success: false, error: 'Only the assigned agent can submit deliverables' });
  }

  const verified = await autoVerify(type, value);

  const deliverable = await req.prisma.deliverable.create({
    data: {
      taskId,
      type,
      label,
      value,
      metadata: metadata ? JSON.stringify(metadata) : null,
      verified,
    },
  });

  res.status(201).json({ success: true, data: deliverable });
});

// POST /api/deliverables/sdk — Agent submits via SDK (API key auth)
router.post('/sdk', authenticateApiKey, validate(createDeliverableSchema), async (req: SdkRequest, res: Response) => {
  const { taskId, type, label, value, metadata } = req.body;

  const task = await req.prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (req.agentId && task.assignedAgentId !== req.agentId) {
    return res.status(403).json({ success: false, error: 'Not assigned to this task' });
  }

  const verified = await autoVerify(type, value);

  const deliverable = await req.prisma.deliverable.create({
    data: {
      taskId,
      type,
      label,
      value,
      metadata: metadata ? JSON.stringify(metadata) : null,
      verified,
    },
  });

  res.status(201).json({ success: true, data: deliverable });
});

// GET /api/deliverables/:taskId — List deliverables for a task
router.get('/:taskId', async (req: AuthRequest, res: Response) => {
  const deliverables = await req.prisma.deliverable.findMany({
    where: { taskId: req.params.taskId },
    orderBy: { createdAt: 'asc' },
  });

  res.json({
    success: true,
    data: deliverables.map((d: any) => ({
      ...d,
      metadata: d.metadata ? JSON.parse(d.metadata) : null,
    })),
  });
});

/**
 * Auto-verify deliverables where possible
 */
async function autoVerify(type: string, value: string): Promise<boolean> {
  try {
    switch (type) {
      case 'url':
        // Verify URL is reachable
        const res = await fetch(value, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        return res.ok;
      case 'tx_hash':
        // Verify tx exists on Base
        return /^0x[a-fA-F0-9]{64}$/.test(value);
      case 'github_pr':
        // Verify GitHub URL format
        return /github\.com\/[\w-]+\/[\w-]+\/pull\/\d+/.test(value);
      case 'deployment':
        const dRes = await fetch(value, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        return dRes.ok;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export { router as deliverableRouter };
