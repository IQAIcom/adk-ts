# Simple Brain Vault Agent

A simplified Brain Vault Agent that demonstrates autonomous yield optimization using ADK-TS with Fraxlend and Odos MCP servers.

## 🎯 What This Does

This example showcases a **5-node LangGraph workflow** that:

1. **Portfolio Data Collection** - Fetches your current Fraxlend positions and available yields
2. **Yield Analysis** - Analyzes opportunities and calculates potential improvements  
3. **Decision Making** - Decides whether rebalancing is worth it (>5% improvement)
4. **Execution** (if needed) - Uses Odos to execute optimal swaps
5. **Reporting** - Provides comprehensive portfolio summary

## 🏗️ Workflow Diagram

```
Start → Portfolio Data → Yield Analysis → Decision
                                            ↙     ↘
                              Rebalancing Execution  Skip
                                            ↘     ↙
                                         Portfolio Report
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# From the root of adk-ts
npm install
```

### 2. Set Up Environment

```bash
# Copy the example environment file
cp examples/simple-brain-vault-agent/env.example examples/simple-brain-vault-agent/.env

# Edit the .env file with your values
nano examples/simple-brain-vault-agent/.env
```

**Required Environment Variables:**

- `WALLET_PRIVATE_KEY` - Your wallet private key (keep secure!)

**Optional:**

- `ODOS_API_KEY` - For better swap routing (recommended but not required)

### 3. Run the Agent

```bash
# From the root of adk-ts
npm run build
node dist/examples/simple-brain-vault-agent/index.js

# Or with ts-node for development:
npx ts-node examples/simple-brain-vault-agent/index.ts
```

## 🔧 What Each Agent Does

### **PortfolioDataAgent**

- Uses **Fraxlend MCP tools** to fetch current positions
- Gets available lending pairs and their APY rates
- Collects gas price estimates
- Ends with: `"DATA_COLLECTION_COMPLETE"`

### **YieldAnalysisAgent**

- Analyzes the collected portfolio data
- Calculates potential yield improvements
- Considers gas costs vs. benefits
- Ends with: `"REBALANCING_RECOMMENDED"` or `"REBALANCING_NOT_NEEDED"`

### **RebalancingExecutorAgent** (if recommended)

- Plans optimal token swaps
- Uses **Odos MCP tools** for best swap routes
- Executes transactions with safety checks
- Ends with: `"REBALANCING_EXECUTED"`

### **SkipRebalancingAgent** (if not needed)

- Documents why rebalancing was skipped
- Provides current status
- Ends with: `"REBALANCING_SKIPPED"`

### **PortfolioReporterAgent**

- Generates comprehensive final report
- Summarizes actions taken
- Provides performance metrics
- Ends with: `"PORTFOLIO_REPORT_COMPLETE"`

## 📊 Example Output

```
🧠 Starting Simple Brain Vault Agent Demo
==========================================
🔄 Connecting to Fraxlend MCP server...
✅ Connected to Fraxlend MCP (8 tools available)
🔄 Connecting to Odos MCP server...
✅ Connected to Odos MCP (6 tools available)
🤖 Initializing Simple Brain Vault Agent...
🚀 Starting Brain Vault rebalancing workflow...
==============================================

[Agent] Step 1: Executing node "portfolio_data"
[Fraxlend] Fetching portfolio for wallet 0x1234...
[Fraxlend] Found 2 active positions: FRAX/USDC, FXS/ETH
[Agent] Step 2: Executing node "yield_analysis"
[Analysis] Current yield: 8.5% APY, Optimal yield: 11.2% APY
[Analysis] Improvement: 2.7% (31.7% relative) - Exceeds 5% threshold
[Agent] Step 3: Executing node "rebalancing_execution"
[Odos] Planning swap: 1000 USDC → FRAX for new position
[Odos] Executing swap via 0x protocol...
[Odos] Transaction: 0xabcd1234... (Gas: 120,000)
[Agent] Step 4: Executing node "portfolio_report"

🎯 Brain Vault Workflow Complete!
==================================
Final Result: Portfolio successfully rebalanced. Expected APY increased from 8.5% to 11.2%. 
Transaction: 0xabcd1234... completed with 0.8% slippage.
Next review recommended in 7 days.
```

## 🔍 Key Features Demonstrated

### **LangGraph Workflow**

- **Sequential execution** with conditional branching
- **Data transfer** between nodes via context memory
- **Error handling** and graceful recovery
- **Audit trail** of all decisions

### **MCP Integration**

- **Dual MCP servers** (Fraxlend + Odos) working together
- **Tool composition** across different protocols
- **Robust error handling** for MCP connections

### **Real DeFi Operations**

- **Live yield monitoring** from Fraxlend
- **Optimal swap routing** via Odos
- **Gas optimization** and slippage protection
- **Transaction execution** with real wallet

## 🛡️ Safety Features

- **Dry run mode** - Set `DRY_RUN=true` to simulate without executing
- **Threshold checks** - Only rebalances if improvement > 5%
- **Gas cost analysis** - Considers transaction costs
- **Slippage protection** - Max 2% slippage on swaps
- **Wallet validation** - Verifies sufficient balance before execution

## 🧪 Testing Without Real Funds

To test safely without risking real assets:

1. **Use a testnet** - Set `RPC_URL` to Goerli/Sepolia
2. **Enable dry run** - Add `DRY_RUN=true` to your `.env`
3. **Use test wallet** - Create a separate wallet for testing
4. **Mock mode** - The agents will simulate operations

## 🔄 Next Steps

Once this simple version works, you can enhance it by:

1. **Adding database persistence** (per the full blueprint)
2. **Implementing cron scheduling** for automated execution
3. **Adding more sophisticated risk management**
4. **Integrating notification systems**
5. **Supporting multiple wallets/users**

## 🐛 Troubleshooting

### MCP Connection Issues

```bash
# Check if MCP servers are accessible
npx @iqai/mcp-fraxlend
npx @iqai/mcp-odos
```

### Wallet Issues

- Ensure private key is valid (64 hex characters)
- Check wallet has sufficient ETH for gas

### Tool Execution Errors

- Enable `DEBUG=true` for detailed logs
- Check agent instructions are clear
- Verify MCP tools are responding correctly

## 📚 Learn More

- [ADK-TS Documentation](../../README.md)
- [LangGraph Agent Guide](../../src/agents/lang-graph-agent.ts)
- [MCP Integration](../../src/tools/mcp/)
- [Full Brain Vault Blueprint](../../BRAIN_VAULT_AGENT_BLUEPRINT.md)
