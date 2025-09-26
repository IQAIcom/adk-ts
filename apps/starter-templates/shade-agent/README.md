<div align="center">
 <img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />
 <br/>
 <h1>ADK-TS Near Shade Agent Template</h1>
 <b>Starter template for creating AI Agents with ADK-TS and Near Shade Agent</b>
 <br/>
  <i>LLM-powered • Onchain Oracles • Secure TEE • TypeScript</i>
</div>

---

# NEAR Shade Agent Template - AI Agents + Blockchain Integration

A template showing how to build AI agents that automatically fetch Ethereum price and sentiment data, then securely store it on the blockchain using NEAR's chain signatures and Phala's Trusted Execution Environment (TEE).

**Built with [ADK-TS](https://adk.iqai.com/) - Agent Development Kit (ADK) for TypeScript**

## 🎯 What This Template Shows

This template demonstrates how to build **AI-powered applications** that:

1. **🤖 Uses AI Agents** (built with ADK-TS) to fetch real-time data:
   - **Price Agent**: Gets current ETH price from CoinGecko API
   - **Sentiment Agent**: Analyzes ETH sentiment from Reddit headlines using AI

2. **🔐 Securely signs transactions** using NEAR's chain signatures in Phala's TEE

3. **📝 Stores data on-chain** by updating an Ethereum smart contract on Sepolia testnet

4. **🌐 Provides REST API** to trigger updates and view account information

## 🏗️ How It Works

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   AI Agents     │    │   Phala TEE      │    │  Ethereum Sepolia   │
│   (ADK-TS)      │    │                  │    │                     │
│ • Price Agent   │───▶│ • NEAR Chain     │───▶│ • Smart Contract    │
│ • Sentiment     │    │   Signatures     │    │ • Price & Sentiment │
│   Agent         │    │ • Secure Signing │    │   Storage           │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- A Google account (for free AI API access)
- A NEAR testnet account (free to create)
- A Phala Network account (free to create)
- Docker Desktop (must be installed and running)

## Step 1: Create Project Using ADK CLI

```bash
# Create a new project with the NEAR Shade Agent template (replace "my-shade-agent" with your desired project name)
npx @iqai/adk-cli new --template shade-agent my-shade-agent

# Navigate to your project and install dependencies
cd my-shade-agent
pnpm install
```

### Step 2: Get Your API Keys

#### 🔑 Google AI API Key (Required)

1. Visit [Google AI Studio](https://aistudio.google.com/api-keys)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

#### 🔑 NEAR Account (Required)

**Option A: Web Interface (Easiest)**

1. Go to [NEAR Testnet Wallet](https://testnet.mynearwallet.com/)
2. Click "Create Account"
3. Follow the setup process
4. Save your account ID and seed phrase

**Option B: Command Line**

```bash
# Create account (replace "your-name" with your desired name)
npx near-cli-rs account create-account sponsor-by-faucet-service your-name.testnet

# When prompted:
# - Add an access key: Choose "autogenerate-new-keypair"
# - Save access key: Choose "save-to-keychain" (IMPORTANT!)
# - Network: Choose "testnet"
# - Proceed: Choose "create"

# Export your seed phrase (needed for the .env file)
npx near-cli-rs account export-account your-name.testnet

# When prompted:
# - Export method: Choose "using-seed-phrase"
# - Network: Choose "testnet"
# - Copy the seed phrase that appears (you'll need this for NEAR_SEED_PHRASE)
```

> **Important Notes:**
>
- 💾 Save both your account ID (e.g., "your-name.testnet") and seed phrase
- 🔒 Keep your seed phrase secure - it's like a password for your account
- If you get "account already exists" error:
  - The account name is taken, try a different name
  - Or if you created it before, just export the existing account using the export command above

#### 🔑 Phala API Key (Required)

1. Visit [Phala Network Console](https://cloud.phala.network/)
2. Sign in with your account
3. Create a new API key
4. Copy the generated key

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.development.local.example .env.development.local
```

Edit `.env.development.local` with your values:

```env
GOOGLE_API_KEY=your_google_api_key_here
NEAR_ACCOUNT_ID=your-name.testnet
NEAR_SEED_PHRASE=your twelve word seed phrase here
NEXT_PUBLIC_contractId=ac-sandbox.your-name.testnet
DOCKER_TAG=your-dockerhub-username/shade-agent
PHALA_API_KEY=your_phala_api_key_here
```

### Step 4: Deploy to Phala Cloud

```bash
# Deploy your shade agent to Phala's TEE infrastructure
pnpm dlx @neardefi/shade-agent-cli
```

This command will:

- Build and push your Docker image to Docker Hub (make sure you're logged in with `docker login`)
- Set up your shade agent in Phala's TEE
- Create necessary NEAR contracts
- Give you a URL like: `https://your-app-id.phala.network`

**💡 Save this URL - you'll use it to test your agent!**

### Step 5: Fund Your Ethereum Address

Your agent needs Sepolia ETH to pay gas fees:

1. **Get your Ethereum address**:

   ```bash
   curl https://your-app-id.phala.network/api/eth-account
   ```

2. **Fund it with Sepolia ETH** using [Google Cloud Web3 faucets](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

## 🧪 Testing Your Template

### Check Agent Status

```bash
# Check if your shade agent is running
curl https://your-app-id.phala.network/api/agent-account

# Expected response:
# {"accountId":"0x...","balance":"1000000000000000000000000"}
```

### Check Ethereum Address

```bash
# Verify your derived Ethereum address has Sepolia ETH
curl https://your-app-id.phala.network/api/eth-account

# Expected response:
# {"senderAddress":"0x...","balance":500000000000000000}
```

### Run the AI Agents and Update Blockchain

```bash
# Trigger the full flow: AI agents → data collection → blockchain update
curl https://your-app-id.phala.network/api/transaction

# Expected response:
# {"txHash":"0x...","newPrice":"4286.5"}
```

What happens:

1. ✨ **AI Price Agent** fetches current ETH price
2. ✨ **AI Sentiment Agent** analyzes ETH sentiment from news
3. 🔐 **Secure signing** happens in Phala's TEE
4. 📝 **Smart contract** gets updated on Ethereum Sepolia
5. 🎉 **Transaction hash** is returned

### View Transaction on Blockchain

Copy your transaction hash and view it on [Sepolia Etherscan](https://sepolia.etherscan.io/):

```
https://sepolia.etherscan.io/tx/YOUR_TX_HASH
```

## 🛠️ Development and Testing

### Test AI Agents Locally

For development and debugging, you have several options:

```bash
# Start the full application locally (includes API and agents)
pnpm dev
```

This runs the entire app locally, including the REST API and agent orchestration.

To test **only the AI agents** (without blockchain or API), use one of the following:

```bash
# Run agents in the terminal (CLI interface)
npx @iqai/adk-cli run

# Open a web interface to chat and interact with agents
npx @iqai/adk-cli web
```

- `run`: Test agents directly in your terminal.
- `web`: Opens a browser-based interface for interactive agent testing.

This lets you quickly debug and experiment with agent logic before integrating with the blockchain or API.

### Smart Contract Details

- **Network**: Ethereum Sepolia Testnet
- **Contract Address**: `0xcDbf74b5395C882a547f7c9e7a5b0a3Bb4552eBF`

## 📁 Template Structure

```
src/
├── agents/
│   ├── agent.ts                 # Root agent orchestrator
│   ├── eth-price-agent/         # Price fetching agent
│   └── eth-sentiment-agent/     # Sentiment analysis agent
├── routes/
│   ├── agentAccount.ts          # NEAR account status
│   ├── ethAccount.ts            # Ethereum address info
│   └── transaction.ts           # Main transaction flow
├── utils/
│   └── ethereum.ts              # Ethereum integration
└── index.ts                     # Server setup
```

## 🔧 Customizing the Template

### Adding New Agents

1. Create a new agent directory in `src/agents/`
2. Follow the pattern from existing agents
3. Add to the root agent in `src/agents/agent.ts`

### Changing Data Sources

- Modify tools in agent directories to fetch from different APIs
- Update the smart contract if you need different data fields

### Adding New Endpoints

- Create new route files in `src/routes/`
- Add to the main server in `src/index.ts`

## 🐛 Troubleshooting

### "Cannot connect to the Docker daemon"

- Make sure Docker Desktop is installed and running on your machine
- Run `docker ps` in your terminal to verify Docker is running

### "Failed to get agent account"

- Ensure your NEAR account has sufficient balance
- Check that `NEAR_ACCOUNT_ID` and `NEAR_SEED_PHRASE` are correct
- Wait a few minutes after deployment for the agent to initialize

### "Failed to send the transaction"

- Make sure your Ethereum address has Sepolia ETH
- Verify your Google API key is working
- Check that the Phala deployment completed successfully

### "Google API key invalid"

- Ensure the API key is from [Google AI Studio](https://aistudio.google.com/api-keys)
- Make sure there are no extra spaces in your `.env` file

## 📚 Learn More

### ADK-TS Resources

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAICOM/adk-ts)

### NEAR Protocol Resources

- [NEAR Documentation](https://docs.near.org/)
- [Chain Signatures](https://docs.near.org/abstraction/chain-signatures)

### Phala Network Resources

- [Phala Documentation](https://docs.phala.network)
- [Phala Cloud Cases](https://docs.phala.com/phala-cloud/cases/overview)

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/shade-agent) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to start building AI-powered applications with NEAR and ADK-TS!
