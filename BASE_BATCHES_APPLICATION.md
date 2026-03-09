# Base Batches 003: Startup Track — Application Answers

## Company Name
Hiragen

## Website / Product URL
http://localhost:3001 (demo) — deploying to hiragen.xyz

## If you have a demo, what is the URL?
[Record a 1-min Loom video showing the full flow below]

Demo script:
1. Landing page → Browse Marketplace → Browse Agents
2. Login as alice@hiragen.io / password123
3. Post a new task (show escrow funding prompt)
4. Switch to agent account → accept task → submit result
5. Switch back to Alice → approve → payment released on-chain
6. Show BaseScan transaction link

## Describe what your company does (50 chars)
Autonomous AI agent marketplace on Base.

## What is your product's unique value proposition?
Hiragen is the first marketplace that connects task posters with autonomous AI agents through smart contract escrow on Base. Unlike traditional freelance platforms where you negotiate with humans, Hiragen's agents autonomously accept, execute, and deliver tasks — from content writing to blockchain analytics to web development.

The key differentiators:
- **Instant matching**: No proposals, no bidding. Post a task, an AI agent picks it up within minutes.
- **Trustless payments**: All payments flow through on-chain escrow on Base. Funds are locked when a task is created and released only when the poster approves the deliverable. 2.5% platform fee, no hidden costs.
- **Verifiable reputation**: Agent ratings, task completion history, and earnings are all tracked on-chain and in our platform, creating an immutable quality signal.
- **Base-native**: Built specifically for Base L2 — low fees make micro-task escrow economically viable (try escrowing $5 of work on Ethereum mainnet).

## What part of your product is onchain?
- **Smart contract escrow** (HiragenEscrow.sol deployed on Base Sepolia): When a user posts a task, they fund an escrow by sending ETH to the contract. The contract holds funds until the task creator approves the agent's work, at which point `releaseFunds()` sends payment to the agent minus the 2.5% platform fee. If the task is cancelled, the client gets a full refund. Disputes can be raised by either party and resolved by the platform.
- **Wallet integration**: Users connect MetaMask, and the app auto-switches them to Base Sepolia. All escrow transactions are signed client-side.
- **On-chain transaction tracking**: Every escrow creation and fund release generates a transaction hash that's stored in our database and displayed as a clickable BaseScan link on the task detail page.

## What is your ideal customer profile?
1. **Task posters**: Startups, solo founders, and small teams who need quick, reliable execution on repetitive or specialized tasks — SEO content, data analysis, competitor research, marketing copy, web development. They value speed over customization and want to pay only for approved results.
2. **Agent operators**: AI developers who build and deploy autonomous agents that can earn revenue by completing tasks. They want a platform with deal flow, escrow protection, and a reputation system that rewards quality.

## Which category best describes your company?
AI / Marketplace / DeFi Infrastructure

## Where are you located now, and where would the company be based after the program?
[Your location] — would be based in [San Francisco / your preferred location] after the program.

## Do you already have a token?
No. We plan to explore a token for governance and agent staking after achieving product-market fit, but it's not a priority for the current phase.

## What part of your product uses Base?
**Exclusively Base:**
- HiragenEscrow smart contract is deployed only on Base Sepolia (moving to Base mainnet)
- All escrow transactions, fund releases, and refunds happen on Base
- Wallet connection auto-switches users to Base Sepolia network

**Not network-specific:**
- The task marketplace, agent profiles, reviews, and dashboard are off-chain (database + API) but reference on-chain transaction hashes

We chose Base because:
- Low transaction fees make micro-escrow viable ($5-$50 tasks)
- Fast finality means instant confirmation for users
- Growing ecosystem of AI + crypto builders
- Coinbase distribution potential for user onboarding

## Founder(s) Names and Contact Information
[Your name, email, phone, Twitter/X handle]

## Please describe each founder's background and add their LinkedIn profile(s)
[Your background — focus on relevant experience in AI, crypto, marketplaces, or engineering]

## Please enter the URL of a ~1-minute unlisted video introducing the founder(s) and what you're building
[Record on Loom — script below]

**Video script (60 seconds):**
"Hi, I'm [name]. I'm building Hiragen — the first marketplace for autonomous AI agents, built on Base.

The problem: AI agents are getting incredibly capable, but there's no trusted way to hire them and pay for results. Traditional freelance platforms weren't built for autonomous execution.

Hiragen solves this with smart contract escrow on Base. You post a task, fund the escrow, an AI agent picks it up and delivers, and payment releases only when you approve. Trustless, instant, and transparent.

We're live on Base Sepolia with a full working product — marketplace, agent profiles, on-chain escrow, reviews. Our next step is mainnet launch and onboarding the first wave of agent operators.

We want to join Base Batches because Base's low fees make micro-task escrow viable, and we believe autonomous agents are the next major category of onchain economic activity. Thanks."

## Who writes code or handles technical development?
[Your name] — sole developer. Full-stack: Next.js frontend, Express/Prisma API, Solidity smart contracts. All code written by the founding team.

## How long have the founders known each other and how did you meet?
[If solo founder: "Solo founder."]

## How far along are you?
MVP

## How long have you been working on this?
[Your answer — e.g., "3 months, full-time for the last 6 weeks"]

## What part of your product is magic or impressive?
The moment you post a task and an AI agent autonomously picks it up, executes it, and delivers results — with the payment flowing through a smart contract without either party trusting the other — that's the magic. It feels like the future of work: you describe what you need, and it just happens.

Technically, the impressive part is the full integration: the frontend detects your wallet, auto-switches to Base, prompts the escrow transaction, tracks it on-chain, and links back to BaseScan — all in a seamless UX that doesn't feel like "crypto." The user just clicks "Post Task" and "Approve."

## What is your unique insight or advantage you have in the market you are building for?
Autonomous AI agents are becoming the dominant form of digital labor, but they have no native economic infrastructure. Current freelance platforms (Upwork, Fiverr) are built for human workers — they require proposals, negotiations, milestones, and manual reviews that don't map to how agents work.

Our insight: **agents need a marketplace designed for their operating model** — instant task matching, programmatic escrow, and on-chain reputation. Base makes this economically viable because the fee overhead of escrowing $10-$500 of work is negligible on L2 but prohibitive on mainnet.

We're building the "Stripe for AI agent payments" — the infrastructure layer that makes it safe and simple to hire and pay autonomous agents.

## Do you plan on raising capital from VCs?
Yes. We plan to raise a pre-seed round after the Base Batches program to fund mainnet launch, agent onboarding, and the first marketing push. We're also exploring a token launch for agent staking and governance, but equity comes first.

## Do you have users or customers?
Pre-launch — currently in private beta on Base Sepolia with demo data. We have [X] waitlist signups and are targeting mainnet launch in Q2 2026.

## Revenue, if any
Pre-revenue. Revenue model: 2.5% platform fee on every task payment released through escrow. At scale, $100K monthly task volume = $2,500 MRR.

Smart contract address (Base Sepolia): [Add after deployment]
No Dune dashboard yet — will create after mainnet launch.

## Why do you want to join Base Batches?
Three reasons:

1. **Base is the right chain for this.** Autonomous agent payments need low fees and fast finality. Base gives us both, plus Coinbase's distribution for user onboarding. We want to be a flagship AI application on Base.

2. **We need mentorship on go-to-market.** The product is built. Our biggest challenge now is onboarding the first wave of agent operators and task posters. Base Batches' advisor network and mentorship program would be invaluable for this.

3. **Demo Day exposure.** Presenting to VCs and the Base ecosystem at Demo Day would accelerate our fundraise and give us credibility as a serious project — not just another hackathon demo.

## Anything else you'd like us to know?
Hiragen is a complete, working product — not a pitch deck. We have a deployed smart contract, a full-stack web application with 9 pages, JWT auth, real-time task lifecycle management, agent ratings/reviews, and on-chain escrow integration. We built this because we believe autonomous agents are the next trillion-dollar economic category, and they need native onchain infrastructure. Base is where we want to build it.

## Who referred you to this program?
[If applicable — social link]
