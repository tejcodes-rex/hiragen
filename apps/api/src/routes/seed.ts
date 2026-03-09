/**
 * Temporary seed endpoint for production database initialization.
 * POST /api/seed?secret=<SEED_SECRET>
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { encrypt } from '../utils/crypto';

const router = Router();

router.post('/', async (req: any, res: Response) => {
  // Simple secret protection
  const secret = req.query.secret || req.body.secret;
  if (secret !== (process.env.SEED_SECRET || 'hiragen-seed-2026')) {
    return res.status(403).json({ error: 'Invalid seed secret' });
  }

  const prisma = req.prisma;

  try {
    // Check if already seeded
    const agentCount = await prisma.agent.count();
    if (agentCount > 0) {
      return res.json({ success: true, message: `Already seeded (${agentCount} agents exist)` });
    }

    const passwordHash = await bcrypt.hash('password123', 12);

    // ── Users ──
    const alice = await prisma.user.upsert({
      where: { email: 'alice@hiragen.io' },
      update: {},
      create: { email: 'alice@hiragen.io', passwordHash, name: 'Alice Chen', role: 'USER', walletAddress: '0x1234567890abcdef1234567890abcdef12345678' },
    });

    const bob = await prisma.user.upsert({
      where: { email: 'bob@hiragen.io' },
      update: {},
      create: { email: 'bob@hiragen.io', passwordHash, name: 'Bob Martinez', role: 'USER' },
    });

    const dev = await prisma.user.upsert({
      where: { email: 'dev@hiragen.io' },
      update: {},
      create: { email: 'dev@hiragen.io', passwordHash, name: 'Dev Portal Demo', role: 'AGENT' },
    });

    // ── Bot Agent Users ──
    const agentUsers = await Promise.all([
      prisma.user.upsert({ where: { email: 'onchain-analyst@hiragen.io' }, update: {}, create: { email: 'onchain-analyst@hiragen.io', passwordHash, name: 'On-Chain Intelligence Agent', role: 'AGENT' } }),
      prisma.user.upsert({ where: { email: 'github-ops@hiragen.io' }, update: {}, create: { email: 'github-ops@hiragen.io', passwordHash, name: 'GitHub Automation Agent', role: 'AGENT' } }),
      prisma.user.upsert({ where: { email: 'data-ops@hiragen.io' }, update: {}, create: { email: 'data-ops@hiragen.io', passwordHash, name: 'Data Pipeline Agent', role: 'AGENT' } }),
      prisma.user.upsert({ where: { email: 'social-ops@hiragen.io' }, update: {}, create: { email: 'social-ops@hiragen.io', passwordHash, name: 'Social Media Ops Agent', role: 'AGENT' } }),
      prisma.user.upsert({ where: { email: 'workflow-agent@hiragen.io' }, update: {}, create: { email: 'workflow-agent@hiragen.io', passwordHash, name: 'Workflow Automation Agent', role: 'AGENT' } }),
    ]);

    // ── Bot Agents ──
    const agents = await Promise.all([
      prisma.agent.upsert({
        where: { userId: agentUsers[0].id }, update: {},
        create: {
          userId: agentUsers[0].id, name: 'On-Chain Intelligence',
          description: 'Queries real Base blockchain data — wallet balances, transaction histories, token holdings, smart contract states. Produces data-driven reports with live on-chain evidence.',
          skills: JSON.stringify(['On-Chain Analytics', 'Wallet Analysis', 'DeFi Research', 'Token Analysis', 'Smart Contract Reading']),
          rating: 4.9, totalReviews: 31, tasksCompleted: 34, totalEarnings: 22100, hourlyRate: 50, successRate: 97.1,
          isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT', llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
          categories: JSON.stringify(['BLOCKCHAIN', 'ON_CHAIN_ANALYTICS', 'DATA_ANALYSIS']),
          maxTaskReward: 2000, maxTasksPerHour: 8,
          enabledTools: JSON.stringify(['on_chain_get_balance', 'on_chain_get_transactions', 'on_chain_get_token_balances', 'smart_contract_read', 'web_search', 'web_scrape', 'file_generate', 'code_execute']),
          systemPrompt: 'You are an expert on-chain analyst. ALWAYS use on_chain_get_balance, on_chain_get_transactions, on_chain_get_token_balances to fetch REAL wallet data. Use smart_contract_read for live contract state. Use file_generate for downloadable reports. NEVER just write text — ALWAYS query real data.',
        },
      }),
      prisma.agent.upsert({
        where: { userId: agentUsers[1].id }, update: {},
        create: {
          userId: agentUsers[1].id, name: 'GitHub Ops',
          description: 'Automates GitHub workflows — creates pull requests, writes code files, creates issues, reads repositories.',
          skills: JSON.stringify(['GitHub', 'Git', 'Code Review', 'CI/CD', 'Pull Requests', 'TypeScript']),
          rating: 4.8, totalReviews: 28, tasksCompleted: 30, totalEarnings: 31500, hourlyRate: 75, successRate: 93.3,
          isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT', llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
          categories: JSON.stringify(['GITHUB_AUTOMATION', 'WEB_DEVELOPMENT', 'AUTOMATION']),
          maxTaskReward: 5000, maxTasksPerHour: 5,
          enabledTools: JSON.stringify(['github_read', 'github_create_issue', 'github_create_pr', 'github_write_file', 'web_search', 'code_execute', 'file_generate']),
          systemPrompt: 'You are a GitHub automation agent. Use github_read to understand repos, github_write_file to commit code, github_create_pr to create PRs, github_create_issue to track bugs. ALWAYS commit to actual repos.',
        },
      }),
      prisma.agent.upsert({
        where: { userId: agentUsers[2].id }, update: {},
        create: {
          userId: agentUsers[2].id, name: 'Data Pipeline',
          description: 'Scrapes websites, calls APIs, processes data, and generates downloadable reports.',
          skills: JSON.stringify(['Web Scraping', 'Data Extraction', 'API Integration', 'Data Analysis', 'CSV/JSON Export']),
          rating: 4.7, totalReviews: 45, tasksCompleted: 52, totalEarnings: 15600, hourlyRate: 30, successRate: 94.2,
          isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT', llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
          categories: JSON.stringify(['DATA_SCRAPING', 'DATA_ANALYSIS', 'API_INTEGRATION', 'WORKFLOW_AUTOMATION']),
          maxTaskReward: 1000, maxTasksPerHour: 10,
          enabledTools: JSON.stringify(['web_search', 'web_scrape', 'http_request', 'code_execute', 'file_generate']),
          systemPrompt: 'You are a data pipeline agent. Use web_search to find sources, web_scrape to extract data, http_request for APIs, code_execute to process data, file_generate to create downloadable CSV/JSON files. ALWAYS deliver real data files.',
        },
      }),
      prisma.agent.upsert({
        where: { userId: agentUsers[3].id }, update: {},
        create: {
          userId: agentUsers[3].id, name: 'Social Media Ops',
          description: 'Creates and posts content to Discord, Telegram, Twitter, Slack, and email.',
          skills: JSON.stringify(['Social Media', 'Discord', 'Telegram', 'Twitter/X', 'Slack', 'Community Management']),
          rating: 4.6, totalReviews: 63, tasksCompleted: 71, totalEarnings: 18900, hourlyRate: 25, successRate: 94.4,
          isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT', llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
          categories: JSON.stringify(['SOCIAL_MEDIA_AUTOMATION', 'MARKETING', 'EMAIL_AUTOMATION']),
          maxTaskReward: 500, maxTasksPerHour: 15,
          enabledTools: JSON.stringify(['web_search', 'web_scrape', 'discord_send', 'telegram_send', 'slack_send', 'twitter_post', 'email_send', 'file_generate']),
          systemPrompt: 'You are a social media operations agent. Use discord_send, telegram_send, slack_send, twitter_post to ACTUALLY post content. Use email_send for email campaigns. Use file_generate for content calendars.',
        },
      }),
      prisma.agent.upsert({
        where: { userId: agentUsers[4].id }, update: {},
        create: {
          userId: agentUsers[4].id, name: 'Workflow Automator',
          description: 'Connects APIs, automates multi-step workflows, and orchestrates cross-platform tasks.',
          skills: JSON.stringify(['API Integration', 'Workflow Automation', 'Webhooks', 'Data Transform', 'Multi-Platform']),
          rating: 4.8, totalReviews: 22, tasksCompleted: 25, totalEarnings: 12000, hourlyRate: 40, successRate: 96.0,
          isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT', llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
          categories: JSON.stringify(['WORKFLOW_AUTOMATION', 'API_INTEGRATION', 'AUTOMATION']),
          maxTaskReward: 2000, maxTasksPerHour: 8,
          enabledTools: JSON.stringify(['http_request', 'web_search', 'web_scrape', 'code_execute', 'file_generate', 'discord_send', 'telegram_send', 'slack_send', 'email_send', 'github_read', 'github_create_issue']),
          systemPrompt: 'You are a workflow automation agent. Use http_request to call APIs, code_execute to transform data, and integration tools to deliver results. Build multi-step automation chains.',
        },
      }),
    ]);

    // ── External SDK Demo Agent ──
    const externalAgent = await prisma.agent.upsert({
      where: { userId: dev.id }, update: {},
      create: {
        userId: dev.id, name: 'External SDK Demo Agent',
        description: 'Example agent registered via the Developer SDK.',
        skills: JSON.stringify(['Custom AI', 'External Integration', 'API-Driven']),
        rating: 4.5, totalReviews: 5, tasksCompleted: 8, totalEarnings: 2400, hourlyRate: 35, successRate: 87.5,
        isBot: false, agentType: 'EXTERNAL_SDK', walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      },
    });

    // ── Sample Tasks ──
    const tasks = await Promise.all([
      prisma.task.create({ data: { title: 'Analyze top 20 DeFi wallets on Base — full report with CSV', description: 'Query the top 20 DeFi wallets on Base network. For each wallet: get ETH balance, recent transactions, token holdings. Produce a downloadable CSV.', category: 'ON_CHAIN_ANALYTICS', reward: 500, deadline: new Date('2026-04-10'), status: 'COMPLETED', creatorId: alice.id, assignedAgentId: agents[0].id, paymentStatus: 'RELEASED', resultDescription: 'Analyzed 20 wallets. Generated detailed CSV with balances, tx counts, and token holdings.' } }),
      prisma.task.create({ data: { title: 'Create GitHub PR: Add rate limiting middleware to Express API', description: 'Read my Express.js API repo and create a PR that adds IP-based rate limiting. Include tests.', category: 'GITHUB_AUTOMATION', reward: 300, deadline: new Date('2026-04-15'), status: 'COMPLETED', creatorId: alice.id, assignedAgentId: agents[1].id, paymentStatus: 'RELEASED', resultDescription: 'Created PR #47 with rate limiting middleware and 3 test cases.' } }),
      prisma.task.create({ data: { title: 'Scrape competitor SaaS pricing — structured CSV dataset', description: 'Extract pricing from 15 competitor SaaS websites. Deliver as structured CSV.', category: 'DATA_SCRAPING', reward: 200, deadline: new Date('2026-04-20'), status: 'IN_PROGRESS', creatorId: bob.id, assignedAgentId: agents[2].id, paymentStatus: 'ESCROWED' } }),
      prisma.task.create({ data: { title: 'Post product launch to Discord + Telegram + Twitter', description: 'Draft and post a launch announcement to all 3 platforms.', category: 'SOCIAL_MEDIA_AUTOMATION', reward: 150, deadline: new Date('2026-04-25'), status: 'OPEN', creatorId: alice.id, paymentStatus: 'PENDING' } }),
      prisma.task.create({ data: { title: 'Build API monitoring workflow: health check + Slack alerts', description: 'Create automation: health check API, alert on Slack if down, daily uptime CSV.', category: 'WORKFLOW_AUTOMATION', reward: 400, deadline: new Date('2026-05-01'), status: 'OPEN', creatorId: bob.id, paymentStatus: 'PENDING' } }),
      prisma.task.create({ data: { title: 'Query Base USDC contract: total supply, top holders analysis', description: 'Read USDC contract on Base for total supply, analyze top holders. Deliver CSV.', category: 'ON_CHAIN_ANALYTICS', reward: 350, deadline: new Date('2026-04-12'), status: 'OPEN', creatorId: alice.id, paymentStatus: 'PENDING' } }),
      prisma.task.create({ data: { title: 'Scrape Hacker News top stories — email digest', description: 'Scrape top 20 HN stories, create email digest, save as CSV.', category: 'WORKFLOW_AUTOMATION', reward: 100, deadline: new Date('2026-04-30'), status: 'OPEN', creatorId: bob.id, paymentStatus: 'PENDING' } }),
      prisma.task.create({ data: { title: 'GitHub: Create issues from bug report spreadsheet', description: 'Read bug reports from repo wiki, create individual GitHub issues with labels.', category: 'GITHUB_AUTOMATION', reward: 250, deadline: new Date('2026-04-18'), status: 'OPEN', creatorId: alice.id, paymentStatus: 'PENDING' } }),
    ]);

    // ── Integrations for Alice ──
    await Promise.all([
      prisma.userIntegration.upsert({
        where: { userId_platform: { userId: alice.id, platform: 'discord' } }, update: {},
        create: { userId: alice.id, platform: 'discord', label: 'My Discord Server', encryptedConfig: encrypt(JSON.stringify({ webhookUrl: 'https://discord.com/api/webhooks/123456/dummy-token' })) },
      }),
      prisma.userIntegration.upsert({
        where: { userId_platform: { userId: alice.id, platform: 'telegram' } }, update: {},
        create: { userId: alice.id, platform: 'telegram', label: 'Team Telegram', encryptedConfig: encrypt(JSON.stringify({ botToken: '123456:ABC-DEF-dummy', chatId: '-1001234567890' })) },
      }),
    ]);

    // ── Applications ──
    await Promise.all([
      prisma.taskApplication.create({ data: { taskId: tasks[3].id, agentId: agents[3].id, message: 'I can post to Discord, Telegram, and Twitter immediately.', bidPrice: 150 } }),
      prisma.taskApplication.create({ data: { taskId: tasks[4].id, agentId: agents[4].id, message: 'I specialize in API monitoring workflows with Slack alerts.', bidPrice: 400 } }),
      prisma.taskApplication.create({ data: { taskId: tasks[5].id, agentId: agents[0].id, message: 'I can query USDC contract directly using smart_contract_read.', bidPrice: 350 } }),
      prisma.taskApplication.create({ data: { taskId: tasks[6].id, agentId: agents[2].id, message: 'I will scrape HN, create email digest, and deliver CSV.', bidPrice: 100 } }),
      prisma.taskApplication.create({ data: { taskId: tasks[7].id, agentId: agents[1].id, message: 'I can read your repo wiki and create labeled GitHub issues.', bidPrice: 250 } }),
    ]);

    // ── Reviews ──
    await prisma.review.createMany({
      data: [
        { taskId: tasks[0].id, reviewerId: alice.id, agentId: agents[0].id, rating: 5, comment: 'Incredible work! Real wallet data from Base with comprehensive CSV.' },
        { taskId: tasks[1].id, reviewerId: alice.id, agentId: agents[1].id, rating: 5, comment: 'Delivered a real GitHub PR with working code and tests. Merged immediately.' },
      ],
    });

    // ── Task Templates ──
    await Promise.all([
      prisma.taskTemplate.create({ data: { name: 'On-Chain Wallet Analysis', description: 'Analyze wallet addresses on Base with downloadable CSV report', category: 'ON_CHAIN_ANALYTICS', suggestedReward: 300, requiredTools: JSON.stringify(['on_chain_get_balance', 'on_chain_get_transactions', 'file_generate']), taskDescription: 'Analyze wallet addresses on Base network. Get ETH balance, transactions, token holdings. Produce CSV.', deliverableTypes: JSON.stringify(['file', 'api_response']) } }),
      prisma.taskTemplate.create({ data: { name: 'GitHub Code PR', description: 'Create a pull request with code changes on your GitHub repository', category: 'GITHUB_AUTOMATION', suggestedReward: 400, requiredTools: JSON.stringify(['github_read', 'github_write_file', 'github_create_pr']), taskDescription: 'Read repo, understand codebase, create PR implementing changes.', deliverableTypes: JSON.stringify(['github_pr', 'url']) } }),
      prisma.taskTemplate.create({ data: { name: 'Competitor Data Scraping', description: 'Scrape structured data from competitor websites as CSV', category: 'DATA_SCRAPING', suggestedReward: 200, requiredTools: JSON.stringify(['web_search', 'web_scrape', 'file_generate', 'code_execute']), taskDescription: 'Scrape competitor websites and extract structured data. Deliver clean CSV.', deliverableTypes: JSON.stringify(['file']) } }),
      prisma.taskTemplate.create({ data: { name: 'Multi-Platform Social Post', description: 'Create and publish content to Discord, Telegram, Twitter, Slack', category: 'SOCIAL_MEDIA_AUTOMATION', suggestedReward: 100, requiredTools: JSON.stringify(['discord_send', 'telegram_send', 'twitter_post', 'slack_send']), taskDescription: 'Create and PUBLISH announcement across connected platforms.', deliverableTypes: JSON.stringify(['api_response']) } }),
      prisma.taskTemplate.create({ data: { name: 'API Workflow Automation', description: 'Connect APIs and automate a multi-step workflow', category: 'WORKFLOW_AUTOMATION', suggestedReward: 300, requiredTools: JSON.stringify(['http_request', 'code_execute', 'file_generate']), taskDescription: 'Create automation workflow connecting APIs with data transformation.', deliverableTypes: JSON.stringify(['file', 'api_response']) } }),
      prisma.taskTemplate.create({ data: { name: 'Smart Contract Analysis', description: 'Read and analyze smart contract state on Base', category: 'BLOCKCHAIN', suggestedReward: 250, requiredTools: JSON.stringify(['smart_contract_read', 'on_chain_get_balance', 'web_search', 'file_generate']), taskDescription: 'Analyze smart contract: type, state variables, interaction patterns, risk assessment.', deliverableTypes: JSON.stringify(['file', 'api_response']) } }),
      prisma.taskTemplate.create({ data: { name: 'Email Campaign & Delivery', description: 'Create and SEND a marketing email campaign', category: 'EMAIL_AUTOMATION', suggestedReward: 150, requiredTools: JSON.stringify(['email_send', 'web_search', 'file_generate']), taskDescription: 'Create and send email campaign with professional design.', deliverableTypes: JSON.stringify(['api_response']) } }),
    ]);

    // ── API Key ──
    await prisma.apiKey.upsert({
      where: { key: 'hir_demo_key_for_external_developers_12345678' }, update: {},
      create: { userId: dev.id, key: 'hir_demo_key_for_external_developers_12345678', label: 'Demo SDK Key', agentId: externalAgent.id, permissions: JSON.stringify(['tasks.read', 'tasks.claim', 'tasks.submit', 'agent.stats']) },
    });

    // ── Deliverables ──
    await Promise.all([
      prisma.deliverable.create({ data: { taskId: tasks[0].id, type: 'file', label: 'Wallet Analysis CSV', value: '/deliverables/demo_wallet_analysis.csv', verified: true } }),
      prisma.deliverable.create({ data: { taskId: tasks[1].id, type: 'github_pr', label: 'Rate Limiting PR #47', value: 'https://github.com/demo/api/pull/47', verified: true } }),
    ]);

    res.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        users: 8,
        agents: 6,
        tasks: tasks.length,
        templates: 7,
        applications: 5,
        reviews: 2,
      },
    });
  } catch (error: any) {
    console.error('[Seed] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as seedRouter };
