<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS NEAR Shade Agent Template</h1>
  <b>Starter template for creating AI agents with ADK-TS and NEAR Shade Agent</b>
  <br/>
  <i>Onchain automation • Phala TEE • NEAR signing • TypeScript</i>
</div>

---

# NEAR Shade Agent Template - AI + Onchain Market Data Updates

A practical starter that runs ADK-TS agents to fetch ETH market data (price + sentiment), then signs and submits updates through NEAR Shade Agent infrastructure to an Ethereum Sepolia contract.

**Built with [ADK-TS](https://adk.iqai.com/) - The TypeScript-native AI Agent Framework**

## 🎯 Features

- **Two specialist AI agents**:
  - Price agent for ETH price retrieval.
  - Sentiment agent for ETH sentiment analysis.
- **Secure signing flow** via Shade Agent and TEE infrastructure.
- **REST API endpoints** for account checks and transaction execution.
- **Local + deploy workflows** for development and Phala environments.

## 🏗️ How It Works

```text
AI Agents (ADK-TS)
   |
   v
Collect ETH price + sentiment
   |
   v
Shade Agent signing flow (TEE / chain signatures)
   |
   v
Broadcast transaction to Sepolia contract
```

## 🚀 Quick Start

Use either approach:

- **Recommended**: scaffold a fresh project with the ADK-TS CLI.
- **Alternative**: clone the repository and copy this template folder into your own project.

### Prerequisites

- Node.js 18+
- pnpm
- Docker Desktop running locally
- Google AI API key from [Google AI Studio](https://aistudio.google.com/api-keys)
- NEAR testnet account from [NEAR Wallet](https://testnet.mynearwallet.com/)
- Phala API key from [Phala Cloud](https://cloud.phala.network/)

### Step 1: Create the project

```bash
npx @iqai/adk-cli new --template shade-agent my-shade-agent
cd my-shade-agent
```

### Step 2: Install dependencies

```bash
pnpm install
```

### Step 3: Configure environment variables

```bash
cp .env.example .env.development.local
```

The `.env.example` file includes required and optional values, grouped by usage.

### Step 4: Run locally

```bash
pnpm dev
```

Local server: `http://localhost:3000`

### Step 5: Build and run production

```bash
pnpm build
pnpm start
```

## 🧪 Test API endpoints

```bash
curl http://localhost:3000/api/agent-account
curl http://localhost:3000/api/eth-account
curl http://localhost:3000/api/transaction
```

## 🛠️ Deploy with Shade Agent CLI

```bash
pnpm dlx @neardefi/shade-agent-cli
```

Expected deployment flow:

- Builds and publishes your container image.
- Provisions Shade Agent resources.
- Returns a hosted URL for your service.

## 📁 Template Structure

```text
src/
├── agents/                     # AI agent orchestration layer
│   ├── agent.ts                # Root agent entry
│   ├── eth-price-agent/        # ETH price specialist agent
│   └── eth-sentiment-agent/    # ETH sentiment specialist agent
├── routes/                     # API endpoints
│   ├── agentAccount.ts         # Shade agent account endpoint
│   ├── ethAccount.ts           # Derived EVM account endpoint
│   └── transaction.ts          # Execute update transaction flow
├── utils/
│   └── ethereum.ts             # EVM helpers and contract interaction
├── env.ts                      # Environment schema and validation
└── index.ts                    # Server entry point
```

## 🧪 Test with ADK-TS CLI

From your project directory, you can test agents without writing custom test scripts.

```bash
# Option 1: Install ADK-TS CLI globally, then run
pnpm install -g @iqai/adk-cli
adk run
adk web

# Option 2: Use npx without global install
npx @iqai/adk-cli run
npx @iqai/adk-cli web
```

- `adk run`: interactive terminal chat with your agent(s).
- `adk web`: launches a local server and opens the ADK-TS web interface.

## 📚 Learn More

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAICOM/adk-ts)
- [ADK-TS Sample Projects](https://github.com/IQAIcom/adk-ts-samples)
- [NEAR Chain Signatures Docs](https://docs.near.org/abstraction/chain-signatures) - how cross-chain signing works.

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/shade-agent) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to start building AI-powered onchain applications with NEAR and ADK-TS.
