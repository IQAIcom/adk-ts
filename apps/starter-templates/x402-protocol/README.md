<div align="center">
 <img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />
 <br/>
 <h1>ADK-TS x402 Agent Template</h1>
 <b>Starter template for creating monetized AI Agents with ADK-TS and x402 payment protocol</b>
 <br/>
  <i>LLM-powered • x402 Micropayments • IQ AI ATP Integration • TypeScript</i>
  </div>

---

# x402 Agent Template - Monetized AI Agents with x402 Protocol

A template showing how to build AI agents that access IQ AI's Agent Tokenization Platform (ATP) through paid API endpoints using the x402 micropayment protocol. The agent pays for API calls automatically using cryptocurrency, enabling new business models for AI-powered services.

**Built with [ADK-TS](https://adk.iqai.com/) - Agent Development Kit (ADK) for TypeScript**

## 🎯 What This Template Shows

This template demonstrates how to build **monetized AI agents** that:

1. **🤖 Access IQ AI's ATP** (Agent Tokenization Platform) through paid API endpoints:
   - **Token Prices**: Get current token prices for IQ AI agents
   - **Agent Holdings**: Get wallet holdings for IQ AI agents
   - **Agent Info**: Retrieve agent metadata by token contract address
   - **Agent Stats**: Get performance statistics for agents
   - **Top Agents**: List top-performing agents by market cap, holders, or inferences

2. **💰 Implement micropayments** using the x402 protocol for API access monetization
3. **🔐 Automatic payment handling** with Web3 wallet integration

4. **🌐 Provides monetized API server** that proxies premium endpoints

## 🏗️ How It Works

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   AI Agent      │    │   x402 Server    │    │   IQ AI ATP API     │
│   (ADK-TS)      │    │                  │    │                     │
│ • Wallet Client │───▶│ • Payment Gates  │───▶│ • Premium Endpoints │
│ • Premium Tools │    │ • Proxy Routes   │    │ • ATP Data          │
│ • Auto Payment  │    │ • Price Config   │    │ • Agent Analytics   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- A Google account (for free AI API access)
- A crypto wallet with Base Sepolia ETH and USDC for micropayments
- Basic understanding of cryptocurrency/Web3

## Step 1: Create Project Using ADK CLI

```bash
# Create a new project with the x402 Agent template (replace "my-x402-agent" with your desired project name)
npx @iqai/adk-cli new --template x402-agent my-x402-agent

# Navigate to your project and install dependencies
cd my-x402-agent
pnpm install
```

### Step 2: Get Your API Keys

#### 🔑 Google AI API Key (Required)

1. Visit [Google AI Studio](https://aistudio.google.com/api-keys)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

#### 🔑 Wallet Private Key (Required)

You need a wallet private key with Base Sepolia ETH for micropayments:

1. **Create a new wallet** (recommended for testing):
   - Use [MetaMask](https://metamask.io/), [Rainbow](https://rainbow.me/), or any Ethereum wallet
   - Export the private key (keep this secure!)

2. **Fund with Base Sepolia ETH**:
   - Get Base Sepolia ETH from [Google Sepolia Faucet](<https://cloud.google.com/application/web3/faucet/ethereum/sepolia>)

3. **Fund with testnet USDC**:
   - Get testnet USDC from [Circle Testnet Faucet](https://faucet.circle.com/)

### Step 3: Configure Environment

Create environment files for both server and agent:

**Server Configuration (.env in `/server` folder):**

```bash
# Navigate to server directory and copy environment file
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
FACILITATOR_URL="https://x402.org/facilitator"
ADDRESS=your_wallet_address_here # Your wallet address (to receive payments)
NETWORK=base-sepolia
```

**Agent Configuration (.env in `/agent` folder):**

```bash
# Navigate to agent directory and copy environment file
cd ../agent
cp .env.example .env
```

Edit `agent/.env`:

```env
ADK_DEBUG=false # Enable debug mode
WALLET_PRIVATE_KEY=your_wallet_private_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

## Step 4: Start the Services

Start both the payment server and AI agent:

```bash
# Start both server and agent in development mode
pnpm dev
```

This will start:

- **Server** on `http://localhost:3001` - handles x402 payments and proxies IQ AI ATP API
- **Agent** on `https://adk-web.iqai.com` - provides web interface to interact with the agent

## 🧪 Testing Your Template

### Check Server Status

```bash
# Check if your server is running and view available endpoints
curl http://localhost:3001/api/price-list
```

Expected response showing endpoint prices:

```json
{
  "prices": {
    "/api/prices": { "price": "$0.01", "network": "base-sepolia" },
    "/api/holdings": { "price": "$0.05", "network": "base-sepolia" },
    "/api/agents/info": { "price": "$0.05", "network": "base-sepolia" },
    "/api/agents/stats": { "price": "$0.05", "network": "base-sepolia" },
    "/api/agents/top": { "price": "$0.10", "network": "base-sepolia" }
  }
}
```

### Interact with the Agent

1. **Open the web interface** at `https://adk-web.iqai.com`
2. **Start a conversation** - the agent will greet you and show current endpoint prices
3. **Ask for agent insights**:
   - "Show me the top agents by market cap"
   - "Get holdings for address 0x..."
   - "Tell me about agent at address 0x..."

### Test Micropayments

The agent will:

1. ✨ **Show prices** when you start a conversation
2. 🔐 **Ask permission** before making any paid calls
3. 💸 **Automatically pay** using your wallet when you approve
4. 📊 **Return data** from IQ AI's ATP API

## 🛠️ Development and Testing

### Test Components Separately

To test just the server or agent individually:

```bash
# Test just the server
cd server && pnpm dev

# Test just the agent (in another terminal)
cd agent && pnpm dev

# Test agent without web interface
cd agent && npx @iqai/adk-cli run
```

### Payment Server Details

- **Base URL**: `http://localhost:3001`
- **Network**: Base Sepolia
- **Payment Protocol**: x402
- **Facilitator**: `https://x402.org/facilitator`

### Available Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/price-list` | Free | Get endpoint pricing information |
| `/api/prices` | $0.01 | Get current token prices |
| `/api/holdings` | $0.05 | Get wallet holdings for IQ AI agents |
| `/api/agents/info` | $0.05 | Get agent metadata by contract address |
| `/api/agents/stats` | $0.05 | Get agent performance statistics |
| `/api/agents/top` | $0.10 | Get top agents by various metrics |

## 📁 Template Structure

```text
x402-agent/
├── agent/                      # AI Agent (ADK-TS)
│   ├── src/
│   │   ├── agents/
│   │   │   └── x402/
│   │   │       ├── agent.ts    # Main agent configuration
│   │   │       └── tools.ts    # Payment-enabled API tools
│   │   └── env.ts              # Environment configuration
│   ├── package.json
│   └── README.md
├── server/                     # Payment Server (Hono + x402)
│   ├── src/
│   │   └── index.ts            # Payment middleware & ATP proxy
│   ├── package.json
│   └── README.md
├── package.json                # Root workspace configuration
└── README.md
```

## 🔧 Customizing the Template

### Adding New Agent Tools

1. **Create new tools** in `agent/src/agents/x402/tools.ts`:

```typescript
const getNewTool = createTool({
  name: "GET_NEW_TOOL",
  description: "Description of your new tool",
  schema: z.object({
    param: z.string().describe("Parameter description"),
  }),
  fn: async ({ param }) => {
    const response = await apiClient.get(`/api/new-endpoint`, {
      params: { param },
    });
    return response.data;
  },
});
```

2. **Add to clientTools** array and update agent instructions

### Adding New Payment Endpoints

1. **Add endpoint to server** in `server/src/index.ts`:

```typescript
// Add to PAID_ROUTES configuration
const PAID_ROUTES = {
  // ... existing routes
  "/api/new-endpoint": { price: "$0.05", network },
};

// Add route handler
app.get("/api/new-endpoint", async (c) => {
  // Your endpoint logic here
});
```

2. **Update agent tools** to use the new endpoint

### Changing Payment Prices

Modify the `PAID_ROUTES` object in `server/src/index.ts`:

```typescript
const PAID_ROUTES: Record<string, { price: string; network: Network }> = {
  "/api/prices": { price: "$0.02", network }, // Changed from $0.01
  // ... other routes
};
```

### Using Different Networks

Update the network configuration in your server `.env`:

```env
NETWORK=mainnet  # or polygon, optimism, etc.
```

## 🐛 Troubleshooting

### "Failed to connect to payment server"

- Ensure the server is running on `http://localhost:3001`
- Check that your `.env` files are properly configured
- Verify your wallet has sufficient Base Sepolia ETH or other tokens for payments

### "Invalid private key" or "Wallet connection failed"

- Verify the private key is valid and has Base Sepolia ETH
- Check that the address matches between agent and server config

### "Google API key invalid"

- Ensure the API key is from [Google AI Studio](https://aistudio.google.com/api-keys)
- Make sure there are no extra spaces in your `.env` file
- Verify the key has proper permissions for Gemini API

### "Agent tools not responding"

- Verify the payment server is running and accessible
- Check server logs for any API proxy errors
- Ensure IQ AI ATP API is accessible from your location

## 📚 Learn More

### ADK-TS Resources

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAICOM/adk-ts)

### x402 Protocol Resources

- [x402 Protocol Documentation](https://www.x402.org/)
- [x402 GitHub Repository](https://github.com/coinbase/x402)

### IQ AI ATP Resources

- [IQ AI Agent Tokenization Platform](https://iqai.com/)
- [ATP API Documentation](https://app.iqai.com/api)

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/x402-agent) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new tool examples
- Improve documentation
- Share your customizations

---

**💰 Ready to monetize?** This template gives you everything you need to start building profitable AI-powered applications with micropayments!
