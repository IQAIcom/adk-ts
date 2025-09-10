
<div align="center">
	<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />
	<br/>
	<h1>ADK Near Shade Agent Template</h1>
	<b>Starter template for creating AI Agents with ADK and Near Shade Agent</b>
	<br/>
		<i>LLM-powered • Onchain Oracles • Secure TEE • TypeScript</i>
</div>

---

This template provides a ready-to-deploy Shade Agent API that uses LLMs to fetch the price and sentiment of Ethereum from news headlines, and saves the results to a contract via the Shade Agent framework. Built with TypeScript and [@iqai/adk](https://www.npmjs.com/package/@iqai/adk), it is designed for NEAR and Phala Cloud TEE environments.

## Features

- Fetches Ethereum price using LLMs
- Analyzes news headlines for ETH sentiment
- Pushes price and sentiment to a contract via Shade Agent
- REST API endpoints for agent and Ethereum account info, and transactions
- Production-ready Docker and pnpm setup

## 🚀 Get Started

The easiest way to create a new project using this template is with the ADK CLI:

```bash
npm install -g @iqai/adk-cli # if you haven't already
adk new --template shade-agent my-shade-agent
cd my-shade-agent
pnpm install
```

## ⚙️ Environment Setup
Make sure to configure your environment variables:

```bash
cp .env.development.local.example .env.development.local
```

Edit `.env.development.local` and fill in the required variables:

- `NEAR_ACCOUNT_ID` — Your NEAR account name (this is used to fund your new shade agent account)
- `NEAR_SEED_PHRASE` — Your NEAR account seed phrase
- `NEXT_PUBLIC_contractId` — Contract ID (should be `ac.proxy.<your-account>` for local, `ac.sandbox.<your-account>` for TEE)
- `NEAR_RPC_JSON`, `GOOGLE_API_KEY`, `ADK_DEBUG` — As needed for your deployment
- `PHALA_API_KEY` — For deploying Agent it to TEE powered by Phala cloud

### 3. Local Development

Start the Shade Agent CLI in one terminal:

```bash
pnpm dlx @neardefi/shade-agent-cli
```

In another terminal, run the API locally:

```bash
pnpm dev
```

### 4. Docker Compose

To build and run the agent in Docker:

```bash
docker compose up --build
```


### 5. Test agents

To test the agents in /agents folder use: 

```bash
adk web
```

This spins up a ui to test your agent with a chat interface and ability to choose agent to chat with and more.


## Endpoints

- `GET /api/agent-account` — Returns agent account and balance
- `GET /api/eth-account` — Returns derived Ethereum Sepolia account and balance
- `POST /api/transaction` — Sends a transaction to update ETH price and sentiment

## Deployment

For TEE/Phala Cloud deployment, follow the official Shade Agent and Phala Cloud documentation. Make sure to update your environment variables for the deployment environment.

## Project Structure

- `src/agents/eth-price-agent/` — LLM-powered ETH price agent
- `src/agents/eth-sentiment-agent/` — LLM-powered ETH sentiment agent
- `src/agents/format-agent/` — This is used to extract sentiment and price of ethereum gathered from root agent in structured output
- `src/routes/` — API endpoints
- `src/utils/` — Ethereum utilities

## License

MIT
