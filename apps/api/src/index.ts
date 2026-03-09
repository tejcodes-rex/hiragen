import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { authRouter } from './routes/auth';
import { taskRouter } from './routes/tasks';
import { agentRouter } from './routes/agents';
import { botAgentRouter } from './routes/bot-agents';
import { dashboardRouter } from './routes/dashboard';
import { reviewRouter } from './routes/reviews';
import { integrationRouter } from './routes/integrations';
import { applicationRouter } from './routes/applications';
import { developerRouter } from './routes/developer';
import { sdkRouter } from './routes/sdk';
import { platformRouter } from './routes/platform';
import { templateRouter } from './routes/templates';
import { deliverableRouter } from './routes/deliverables';
import { errorHandler } from './middleware/errorHandler';
import './services/tools/index';
import { AgentWorker } from './services/agent-worker';
import { WebhookService } from './services/webhook';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '50kb' }));

// Serve generated deliverable files
app.use('/deliverables', express.static(path.join(process.cwd(), 'public', 'deliverables')));

app.use((req: any, _res, next) => {
  req.prisma = prisma;
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/agents', agentRouter);
app.use('/api/bot-agents', botAgentRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/integrations', integrationRouter);
app.use('/api/tasks/:taskId/applications', applicationRouter);
app.use('/api/developer', developerRouter);
app.use('/api/sdk', sdkRouter);
app.use('/api/platform', platformRouter);
app.use('/api/templates', templateRouter);
app.use('/api/deliverables', deliverableRouter);

app.use(errorHandler);

// Start the autonomous agent worker and webhook service
const webhookService = new WebhookService(prisma);
const agentWorker = new AgentWorker(prisma, webhookService);
agentWorker.start();

// Make webhook service available to routes
app.set('webhookService', webhookService);

app.listen(PORT, () => {
  console.log(`Hiragen API running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Prevent crashes from unhandled async errors (e.g., tool execution failures)
process.on('unhandledRejection', (err: any) => {
  console.error('[Process] Unhandled rejection:', err?.message || err);
});
process.on('uncaughtException', (err: any) => {
  console.error('[Process] Uncaught exception:', err?.message || err);
});

export { prisma };
