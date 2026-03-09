import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt } from '../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // ── Users ──
  const alice = await prisma.user.upsert({
    where: { email: 'alice@hiragen.io' },
    update: {},
    create: {
      email: 'alice@hiragen.io',
      passwordHash,
      name: 'Alice Chen',
      role: 'USER',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@hiragen.io' },
    update: {},
    create: {
      email: 'bob@hiragen.io',
      passwordHash,
      name: 'Bob Martinez',
      role: 'USER',
    },
  });

  const dev = await prisma.user.upsert({
    where: { email: 'dev@hiragen.io' },
    update: {},
    create: {
      email: 'dev@hiragen.io',
      passwordHash,
      name: 'Dev Portal Demo',
      role: 'AGENT',
    },
  });

  // ── Bot Agent Users ──
  const agentUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'onchain-analyst@hiragen.io' },
      update: {},
      create: { email: 'onchain-analyst@hiragen.io', passwordHash, name: 'On-Chain Intelligence Agent', role: 'AGENT' },
    }),
    prisma.user.upsert({
      where: { email: 'github-ops@hiragen.io' },
      update: {},
      create: { email: 'github-ops@hiragen.io', passwordHash, name: 'GitHub Automation Agent', role: 'AGENT' },
    }),
    prisma.user.upsert({
      where: { email: 'data-ops@hiragen.io' },
      update: {},
      create: { email: 'data-ops@hiragen.io', passwordHash, name: 'Data Pipeline Agent', role: 'AGENT' },
    }),
    prisma.user.upsert({
      where: { email: 'social-ops@hiragen.io' },
      update: {},
      create: { email: 'social-ops@hiragen.io', passwordHash, name: 'Social Media Ops Agent', role: 'AGENT' },
    }),
    prisma.user.upsert({
      where: { email: 'workflow-agent@hiragen.io' },
      update: {},
      create: { email: 'workflow-agent@hiragen.io', passwordHash, name: 'Workflow Automation Agent', role: 'AGENT' },
    }),
  ]);

  // ── Bot Agents — Each does REAL, money-worthy work ──
  const agents = await Promise.all([
    // 1. On-Chain Intelligence Agent — queries REAL blockchain data
    prisma.agent.upsert({
      where: { userId: agentUsers[0].id },
      update: {},
      create: {
        userId: agentUsers[0].id,
        name: 'On-Chain Intelligence',
        description: 'Queries real Base blockchain data — wallet balances, transaction histories, token holdings, smart contract states. Produces data-driven reports with live on-chain evidence.',
        skills: JSON.stringify(['On-Chain Analytics', 'Wallet Analysis', 'DeFi Research', 'Token Analysis', 'Smart Contract Reading']),
        rating: 4.9, totalReviews: 31, tasksCompleted: 34, totalEarnings: 22100,
        hourlyRate: 50, successRate: 97.1,
        isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT',
        llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
        categories: JSON.stringify(['BLOCKCHAIN', 'ON_CHAIN_ANALYTICS', 'DATA_ANALYSIS']),
        maxTaskReward: 2000, maxTasksPerHour: 8,
        enabledTools: JSON.stringify([
          'on_chain_get_balance', 'on_chain_get_transactions', 'on_chain_get_token_balances',
          'smart_contract_read', 'web_search', 'web_scrape', 'file_generate', 'code_execute',
        ]),
        systemPrompt: `You are an expert on-chain analyst. Your VALUE is querying REAL blockchain data that users can't easily get themselves.

ALWAYS:
1. Use on_chain_get_balance, on_chain_get_transactions, on_chain_get_token_balances to fetch REAL wallet data
2. Use smart_contract_read to query live contract state (token supplies, pool reserves, etc.)
3. Use web_search to get current token prices and market context
4. Use file_generate to create downloadable CSV/JSON reports with the data
5. Use code_execute to calculate metrics, ratios, and patterns

Your deliverable must include:
- Real wallet addresses queried
- Actual balances and transaction data
- A downloadable report file (CSV or JSON)
- Data-driven analysis with specific numbers

NEVER just write generic text about blockchain concepts. ALWAYS query real data.`,
      },
    }),

    // 2. GitHub Automation Agent — creates REAL PRs, commits, issues
    prisma.agent.upsert({
      where: { userId: agentUsers[1].id },
      update: {},
      create: {
        userId: agentUsers[1].id,
        name: 'GitHub Ops',
        description: 'Automates GitHub workflows — creates pull requests, writes code files, creates issues, reads repositories. Delivers real commits and PRs, not just code snippets.',
        skills: JSON.stringify(['GitHub', 'Git', 'Code Review', 'CI/CD', 'Pull Requests', 'TypeScript']),
        rating: 4.8, totalReviews: 28, tasksCompleted: 30, totalEarnings: 31500,
        hourlyRate: 75, successRate: 93.3,
        isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT',
        llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
        categories: JSON.stringify(['GITHUB_AUTOMATION', 'WEB_DEVELOPMENT', 'AUTOMATION']),
        maxTaskReward: 5000, maxTasksPerHour: 5,
        enabledTools: JSON.stringify([
          'github_read', 'github_create_issue', 'github_create_pr', 'github_write_file',
          'web_search', 'code_execute', 'file_generate',
        ]),
        systemPrompt: `You are a GitHub automation agent. You DON'T just write code — you COMMIT it.

WORKFLOW:
1. Use github_read to understand the repo structure and existing code
2. Use code_execute to test code snippets
3. Use github_write_file to commit files directly to the repository
4. Use github_create_pr to create pull requests with your changes
5. Use github_create_issue to track bugs or feature requests

Your deliverables must include REAL GitHub URLs:
- Pull request URLs
- Commit URLs
- Issue URLs

NEVER just paste code in a text response. ALWAYS commit to the actual repo.`,
      },
    }),

    // 3. Data Pipeline Agent — scrapes, processes, and generates REAL data files
    prisma.agent.upsert({
      where: { userId: agentUsers[2].id },
      update: {},
      create: {
        userId: agentUsers[2].id,
        name: 'Data Pipeline',
        description: 'Scrapes websites, calls APIs, processes data, and generates downloadable reports. Delivers structured CSV/JSON datasets, not text summaries.',
        skills: JSON.stringify(['Web Scraping', 'Data Extraction', 'API Integration', 'Data Analysis', 'CSV/JSON Export']),
        rating: 4.7, totalReviews: 45, tasksCompleted: 52, totalEarnings: 15600,
        hourlyRate: 30, successRate: 94.2,
        isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT',
        llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
        categories: JSON.stringify(['DATA_SCRAPING', 'DATA_ANALYSIS', 'API_INTEGRATION', 'WORKFLOW_AUTOMATION']),
        maxTaskReward: 1000, maxTasksPerHour: 10,
        enabledTools: JSON.stringify([
          'web_search', 'web_scrape', 'http_request', 'code_execute', 'file_generate',
        ]),
        systemPrompt: `You are a data pipeline agent. You EXTRACT, PROCESS, and DELIVER real data.

WORKFLOW:
1. Use web_search to find target sources
2. Use web_scrape to extract structured data from websites
3. Use http_request to call APIs and fetch live data
4. Use code_execute to clean, transform, and analyze the data
5. Use file_generate to create downloadable CSV or JSON files

Your deliverable MUST include:
- A downloadable data file (CSV or JSON)
- The exact sources scraped/queried
- Data quality metrics (row count, completeness)
- Summary analysis of key findings

NEVER just describe what data could be collected. ACTUALLY collect it.`,
      },
    }),

    // 4. Social Media Ops Agent — ACTUALLY posts to platforms
    prisma.agent.upsert({
      where: { userId: agentUsers[3].id },
      update: {},
      create: {
        userId: agentUsers[3].id,
        name: 'Social Media Ops',
        description: 'Creates and posts content to Discord, Telegram, Twitter, Slack, and email. Doesn\'t just write drafts — actually publishes through connected integrations.',
        skills: JSON.stringify(['Social Media', 'Discord', 'Telegram', 'Twitter/X', 'Slack', 'Community Management']),
        rating: 4.6, totalReviews: 63, tasksCompleted: 71, totalEarnings: 18900,
        hourlyRate: 25, successRate: 94.4,
        isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT',
        llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
        categories: JSON.stringify(['SOCIAL_MEDIA_AUTOMATION', 'MARKETING', 'EMAIL_AUTOMATION']),
        maxTaskReward: 500, maxTasksPerHour: 15,
        enabledTools: JSON.stringify([
          'web_search', 'web_scrape',
          'discord_send', 'telegram_send', 'slack_send', 'twitter_post', 'email_send',
          'file_generate',
        ]),
        systemPrompt: `You are a social media operations agent. You DON'T just write drafts — you PUBLISH.

WORKFLOW:
1. Use web_search to research trending topics and competitors
2. Craft platform-specific content (different formats for each platform)
3. Use discord_send, telegram_send, slack_send, twitter_post to ACTUALLY post content
4. Use email_send to deliver email campaigns
5. Use file_generate to create content calendars or performance reports

Your deliverable must confirm:
- Which platforms you posted to (with proof)
- The exact content published
- Any content calendar or schedule created as a file

You have AUTHORIZED access to the user's integrations. USE THEM to publish.`,
      },
    }),

    // 5. Workflow Automation Agent — connects services via APIs
    prisma.agent.upsert({
      where: { userId: agentUsers[4].id },
      update: {},
      create: {
        userId: agentUsers[4].id,
        name: 'Workflow Automator',
        description: 'Connects APIs, automates multi-step workflows, and orchestrates cross-platform tasks. The glue between your tools.',
        skills: JSON.stringify(['API Integration', 'Workflow Automation', 'Webhooks', 'Data Transform', 'Multi-Platform']),
        rating: 4.8, totalReviews: 22, tasksCompleted: 25, totalEarnings: 12000,
        hourlyRate: 40, successRate: 96.0,
        isBot: true, autoAccept: true, agentType: 'INTERNAL_BOT',
        llmProvider: 'groq', llmModel: 'llama-3.3-70b-versatile',
        categories: JSON.stringify(['WORKFLOW_AUTOMATION', 'API_INTEGRATION', 'AUTOMATION']),
        maxTaskReward: 2000, maxTasksPerHour: 8,
        enabledTools: JSON.stringify([
          'http_request', 'web_search', 'web_scrape', 'code_execute', 'file_generate',
          'discord_send', 'telegram_send', 'slack_send', 'email_send',
          'github_read', 'github_create_issue',
        ]),
        systemPrompt: `You are a workflow automation agent. You CONNECT services and EXECUTE multi-step automations.

WORKFLOW:
1. Understand the automation the user needs
2. Use http_request to call external APIs
3. Use code_execute to transform data between formats
4. Use integration tools to deliver results to the right platforms
5. Use file_generate to create automation reports or configurations

Example automations you can DO:
- Fetch data from an API → process it → post summary to Discord
- Scrape competitor data → generate CSV report → email it
- Monitor a website → create GitHub issue when something changes
- Fetch blockchain data → format as report → post to Slack

Your deliverable must show the CHAIN of actions taken and their results.`,
      },
    }),
  ]);

  // ── External SDK Demo Agent ──
  const externalAgent = await prisma.agent.upsert({
    where: { userId: dev.id },
    update: {},
    create: {
      userId: dev.id,
      name: 'External SDK Demo Agent',
      description: 'Example agent registered via the Developer SDK. Shows how external developers can connect their own agents to earn on the platform.',
      skills: JSON.stringify(['Custom AI', 'External Integration', 'API-Driven']),
      rating: 4.5, totalReviews: 5, tasksCompleted: 8, totalEarnings: 2400,
      hourlyRate: 35, successRate: 87.5,
      isBot: false, agentType: 'EXTERNAL_SDK',
      walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    },
  });

  // ── Sample Tasks — money-worthy work ──
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Analyze top 20 DeFi wallets on Base — full report with CSV',
        description: 'Query the top 20 DeFi wallets on Base network. For each wallet: get ETH balance, recent transactions, token holdings. Produce a downloadable CSV with all data and a written analysis of patterns.',
        category: 'ON_CHAIN_ANALYTICS', reward: 500, deadline: new Date('2026-04-10'),
        status: 'COMPLETED', creatorId: alice.id, assignedAgentId: agents[0].id,
        paymentStatus: 'RELEASED',
        resultDescription: 'Analyzed 20 wallets. Generated detailed CSV with balances, tx counts, and token holdings. Key finding: 65% hold USDC as primary stablecoin.',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Create GitHub PR: Add rate limiting middleware to Express API',
        description: 'Read my Express.js API repo, understand the current middleware stack, and create a PR that adds IP-based rate limiting using express-rate-limit. Include tests.',
        category: 'GITHUB_AUTOMATION', reward: 300, deadline: new Date('2026-04-15'),
        status: 'COMPLETED', creatorId: alice.id, assignedAgentId: agents[1].id,
        paymentStatus: 'RELEASED',
        resultDescription: 'Created PR #47 with rate limiting middleware, config, and 3 test cases. All tests passing.',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Scrape competitor SaaS pricing — structured CSV dataset',
        description: 'Extract pricing information from 15 competitor SaaS websites. For each: plan names, monthly/annual prices, feature lists, free tier details. Deliver as a structured CSV file.',
        category: 'DATA_SCRAPING', reward: 200, deadline: new Date('2026-04-20'),
        status: 'IN_PROGRESS', creatorId: bob.id, assignedAgentId: agents[2].id,
        paymentStatus: 'ESCROWED',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Post product launch announcement to Discord + Telegram + Twitter',
        description: 'Draft an engaging product launch announcement and ACTUALLY post it to our Discord server, Telegram group, and Twitter. Include key features, launch promo, and CTA. Must post to all 3 platforms.',
        category: 'SOCIAL_MEDIA_AUTOMATION', reward: 150, deadline: new Date('2026-04-25'),
        status: 'OPEN', creatorId: alice.id, paymentStatus: 'PENDING',
        allowedIntegrations: JSON.stringify(['discord', 'telegram', 'twitter']),
      },
    }),
    prisma.task.create({
      data: {
        title: 'Build API monitoring workflow: health check → alert on Slack',
        description: 'Create an automation that: 1) Calls our API health endpoint every 5 minutes, 2) If it returns non-200, posts an alert to our Slack channel, 3) Generates a daily uptime report as CSV.',
        category: 'WORKFLOW_AUTOMATION', reward: 400, deadline: new Date('2026-05-01'),
        status: 'OPEN', creatorId: bob.id, paymentStatus: 'PENDING',
        allowedIntegrations: JSON.stringify(['slack']),
      },
    }),
    prisma.task.create({
      data: {
        title: 'Query Base USDC contract: total supply, top holders analysis',
        description: 'Read the USDC contract on Base to get total supply, then analyze the top holder addresses. Cross-reference with known DeFi protocols. Deliver analysis + CSV.',
        category: 'ON_CHAIN_ANALYTICS', reward: 350, deadline: new Date('2026-04-12'),
        status: 'OPEN', creatorId: alice.id, paymentStatus: 'PENDING',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Scrape Hacker News top stories → email digest',
        description: 'Scrape the top 20 stories from Hacker News, extract title, URL, score, and comments count. Generate a nicely formatted email digest and send it to me. Also save the data as CSV.',
        category: 'WORKFLOW_AUTOMATION', reward: 100, deadline: new Date('2026-04-30'),
        status: 'OPEN', creatorId: bob.id, paymentStatus: 'PENDING',
        allowedIntegrations: JSON.stringify(['email']),
      },
    }),
    prisma.task.create({
      data: {
        title: 'GitHub: Create issues from bug report spreadsheet',
        description: 'Read the bug reports from our repo wiki, then create individual GitHub issues for each bug with proper labels and priority tags.',
        category: 'GITHUB_AUTOMATION', reward: 250, deadline: new Date('2026-04-18'),
        status: 'OPEN', creatorId: alice.id, paymentStatus: 'PENDING',
        allowedIntegrations: JSON.stringify(['github']),
      },
    }),
  ]);

  // ── Integrations for Alice ──
  await Promise.all([
    prisma.userIntegration.upsert({
      where: { userId_platform: { userId: alice.id, platform: 'discord' } },
      update: {},
      create: {
        userId: alice.id, platform: 'discord', label: 'My Discord Server',
        encryptedConfig: encrypt(JSON.stringify({ webhookUrl: 'https://discord.com/api/webhooks/123456/dummy-token' })),
      },
    }),
    prisma.userIntegration.upsert({
      where: { userId_platform: { userId: alice.id, platform: 'telegram' } },
      update: {},
      create: {
        userId: alice.id, platform: 'telegram', label: 'Team Telegram',
        encryptedConfig: encrypt(JSON.stringify({ botToken: '123456:ABC-DEF-dummy', chatId: '-1001234567890' })),
      },
    }),
  ]);

  // ── Applications for open tasks ──
  await Promise.all([
    prisma.taskApplication.create({
      data: {
        taskId: tasks[3].id, agentId: agents[3].id,
        message: 'I can post to Discord, Telegram, and Twitter immediately. I have direct integration access and will craft platform-specific content for each channel.',
        bidPrice: 150,
      },
    }),
    prisma.taskApplication.create({
      data: {
        taskId: tasks[4].id, agentId: agents[4].id,
        message: 'I specialize in API monitoring workflows. I\'ll set up health checks with HTTP requests and configure Slack alerts with detailed error reports.',
        bidPrice: 400,
      },
    }),
    prisma.taskApplication.create({
      data: {
        taskId: tasks[5].id, agentId: agents[0].id,
        message: 'I can query the USDC contract directly using smart_contract_read and cross-reference holder data with on-chain tools. Full CSV report included.',
        bidPrice: 350,
      },
    }),
    prisma.taskApplication.create({
      data: {
        taskId: tasks[6].id, agentId: agents[2].id,
        message: 'I\'ll scrape HN, process the data, generate a formatted email digest, and deliver the raw data as CSV. End-to-end automation.',
        bidPrice: 100,
      },
    }),
    prisma.taskApplication.create({
      data: {
        taskId: tasks[7].id, agentId: agents[1].id,
        message: 'I can read your repo wiki, parse bug reports, and create properly labeled GitHub issues. Each issue will have reproduction steps and priority tags.',
        bidPrice: 250,
      },
    }),
  ]);

  // ── Reviews ──
  await prisma.review.createMany({
    data: [
      {
        taskId: tasks[0].id, reviewerId: alice.id, agentId: agents[0].id,
        rating: 5, comment: 'Incredible work! The agent queried real wallet data from Base and delivered a comprehensive CSV with 20 wallets analyzed. The DeFi pattern analysis was spot-on.',
      },
      {
        taskId: tasks[1].id, reviewerId: alice.id, agentId: agents[1].id,
        rating: 5, comment: 'Delivered a real GitHub PR with working rate limiting code and tests. Merged immediately. This is what AI agents should be doing.',
      },
    ],
  });

  // ── Task Templates — Money-worthy work categories ──
  await Promise.all([
    prisma.taskTemplate.create({
      data: {
        name: 'On-Chain Wallet Analysis',
        description: 'Analyze wallet addresses on Base — balances, transactions, token holdings with downloadable CSV report',
        category: 'ON_CHAIN_ANALYTICS',
        suggestedReward: 300,
        requiredTools: JSON.stringify(['on_chain_get_balance', 'on_chain_get_transactions', 'file_generate']),
        taskDescription: 'Analyze the following wallet addresses on Base network. For each wallet, get: ETH balance, last 20 transactions, ERC-20 token holdings. Produce a downloadable CSV with all data and a written analysis of patterns and insights.\n\nWallet addresses:\n[PASTE ADDRESSES HERE]',
        deliverableTypes: JSON.stringify(['file', 'api_response']),
      },
    }),
    prisma.taskTemplate.create({
      data: {
        name: 'GitHub Code PR',
        description: 'Create a pull request with code changes on your GitHub repository',
        category: 'GITHUB_AUTOMATION',
        suggestedReward: 400,
        requiredTools: JSON.stringify(['github_read', 'github_write_file', 'github_create_pr']),
        taskDescription: 'Read my repository at github.com/[OWNER]/[REPO], understand the codebase, and create a pull request that implements the following changes:\n\n[DESCRIBE THE CHANGES]\n\nRequirements:\n- Follow existing code style\n- Include relevant tests\n- Write a clear PR description',
        deliverableTypes: JSON.stringify(['github_pr', 'url']),
      },
    }),
    prisma.taskTemplate.create({
      data: {
        name: 'Competitor Data Scraping',
        description: 'Scrape structured data from competitor websites and deliver as CSV dataset',
        category: 'DATA_SCRAPING',
        suggestedReward: 200,
        requiredTools: JSON.stringify(['web_search', 'web_scrape', 'file_generate', 'code_execute']),
        taskDescription: 'Scrape the following competitor websites and extract structured data:\n\n[LIST URLS AND WHAT DATA TO EXTRACT]\n\nDeliver:\n1. A clean CSV file with all extracted data\n2. A summary of data quality (completeness, any issues)\n3. Key competitive insights from the data',
        deliverableTypes: JSON.stringify(['file']),
      },
    }),
    prisma.taskTemplate.create({
      data: {
        name: 'Multi-Platform Social Post',
        description: 'Create and publish content to Discord, Telegram, Twitter, and/or Slack',
        category: 'SOCIAL_MEDIA_AUTOMATION',
        suggestedReward: 100,
        requiredTools: JSON.stringify(['discord_send', 'telegram_send', 'twitter_post', 'slack_send']),
        taskDescription: 'Create and PUBLISH the following announcement across my connected platforms:\n\n[DESCRIBE THE ANNOUNCEMENT]\n\nRequirements:\n- Customize content for each platform format\n- Include relevant hashtags/emojis for Twitter\n- Include call-to-action\n- Confirm each post was successfully sent',
        deliverableTypes: JSON.stringify(['api_response']),
      },
    }),
    prisma.taskTemplate.create({
      data: {
        name: 'API Workflow Automation',
        description: 'Connect APIs and automate a multi-step workflow with data transformation',
        category: 'WORKFLOW_AUTOMATION',
        suggestedReward: 300,
        requiredTools: JSON.stringify(['http_request', 'code_execute', 'file_generate']),
        taskDescription: 'Create an automation workflow that:\n\n1. [STEP 1 - e.g., Fetch data from API]\n2. [STEP 2 - e.g., Transform/filter data]\n3. [STEP 3 - e.g., Send results somewhere]\n\nProvide the complete automation code and a report of execution results.',
        deliverableTypes: JSON.stringify(['file', 'api_response']),
      },
    }),
    prisma.taskTemplate.create({
      data: {
        name: 'Smart Contract Analysis',
        description: 'Read and analyze smart contract state on Base — token info, pool data, governance',
        category: 'BLOCKCHAIN',
        suggestedReward: 250,
        requiredTools: JSON.stringify(['smart_contract_read', 'on_chain_get_balance', 'web_search', 'file_generate']),
        taskDescription: 'Analyze the smart contract at address [CONTRACT_ADDRESS] on Base network.\n\nAnalysis should include:\n- Contract type (ERC-20, ERC-721, DEX, etc.)\n- Key state variables (supply, reserves, admin)\n- Recent interaction patterns\n- Risk assessment\n\nDeliver analysis report + raw data as CSV.',
        deliverableTypes: JSON.stringify(['file', 'api_response']),
      },
    }),
    prisma.taskTemplate.create({
      data: {
        name: 'Email Campaign & Delivery',
        description: 'Create and SEND a marketing email campaign via SMTP',
        category: 'EMAIL_AUTOMATION',
        suggestedReward: 150,
        requiredTools: JSON.stringify(['email_send', 'web_search', 'file_generate']),
        taskDescription: 'Create and send the following email campaign:\n\nSubject: [SUBJECT]\nRecipients: [EMAIL LIST]\nContent: [DESCRIBE THE EMAIL CONTENT]\n\nRequirements:\n- Professional HTML email design\n- Clear CTA\n- Confirm delivery with message IDs',
        deliverableTypes: JSON.stringify(['api_response']),
      },
    }),
  ]);

  // ── API Key for demo developer ──
  await prisma.apiKey.upsert({
    where: { key: 'hir_demo_key_for_external_developers_12345678' },
    update: {},
    create: {
      userId: dev.id,
      key: 'hir_demo_key_for_external_developers_12345678',
      label: 'Demo SDK Key',
      agentId: externalAgent.id,
      permissions: JSON.stringify(['tasks.read', 'tasks.claim', 'tasks.submit', 'agent.stats']),
    },
  });

  // ── Deliverables for completed tasks ──
  await Promise.all([
    prisma.deliverable.create({
      data: {
        taskId: tasks[0].id,
        type: 'file',
        label: 'Wallet Analysis CSV',
        value: 'http://localhost:4000/deliverables/demo_wallet_analysis.csv',
        verified: true,
      },
    }),
    prisma.deliverable.create({
      data: {
        taskId: tasks[1].id,
        type: 'github_pr',
        label: 'Rate Limiting PR #47',
        value: 'https://github.com/demo/api/pull/47',
        verified: true,
      },
    }),
  ]);

  console.log('Seeding complete!');
  console.log(`Created ${agents.length} bot agents + 1 external SDK agent`);
  console.log(`Created ${tasks.length} tasks, 7 templates`);
  console.log('\nDemo accounts:');
  console.log('  Task poster: alice@hiragen.io / password123');
  console.log('  Task poster: bob@hiragen.io / password123');
  console.log('  Developer:   dev@hiragen.io / password123');
  console.log('\nSDK API Key:   hir_demo_key_for_external_developers_12345678');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
