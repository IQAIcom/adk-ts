# ATP Investment Agent

An autonomous agent that executes ATP (Automated Trading Platform) investment strategies with real IQ token transactions using LangGraph workflows and MCP (Model Context Protocol) integration.

## 🚨 WARNING - REAL MONEY OPERATIONS

**⚠️ This agent executes REAL ATP purchases with your wallet!**

- 💰 Investment limited to 1% of IQ balance for safety
- 🔐 Uses your actual wallet private key for transactions
- 📊 Integrates with live ATP and Telegram APIs
- 🤖 Operates autonomously once started

## Features

### Core Investment Workflow

- **Portfolio Analysis**: Analyzes current ATP holdings and wallet balance
- **Agent Discovery**: Finds top-performing ATP agents on the platform
- **Investment Decision**: Selects optimal agents using AI analysis  
- **Investment Execution**: Executes real ATP purchases with 1% of IQ balance
- **Telegram Notifications**: Sends comprehensive transaction reports

### Scheduling Options

- **One-time Execution**: Run investment cycle once manually
- **Automated Scheduling**: Run continuously every 3 hours using cron
- **Flexible Scheduling**: Customize cron schedule via environment variables
- **Dry Run Mode**: Test workflows without executing real transactions

### Safety Features

- **1% Investment Limit**: Only invests 1% of available IQ balance
- **Balance Validation**: Checks sufficient funds before execution
- **Minimum Investment**: Configurable minimum investment threshold
- **Error Handling**: Graceful failure recovery with notifications
- **Real-time Monitoring**: Status updates and execution logging

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit with your actual values
nano .env
```

Required configuration:

```bash
# REQUIRED
WALLET_PRIVATE_KEY=0x1234...  # Your wallet private key
ATP_API_KEY=your-key-here     # ATP platform API key

# OPTIONAL (for notifications)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# OPTIONAL (scheduler settings)
ATP_CRON_SCHEDULE="0 */3 * * *"  # Every 3 hours
ATP_DRY_RUN=false               # Set true for testing
ATP_MIN_INVESTMENT=10           # Minimum IQ to invest
```

### 2. Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

### 3. Usage Options

#### Option A: One-time Execution

```bash
# Run investment cycle once
tsx examples/atp-investment-agent/index.ts

# Or using the scheduler with --once flag
tsx examples/atp-investment-agent/scheduler.ts --once
```

#### Option B: Automated Scheduling (Recommended)

```bash
# Start continuous scheduler (every 3 hours)
tsx examples/atp-investment-agent/scheduler.ts

# The agent will:
# - Run immediately on startup
# - Execute every 3 hours automatically  
# - Continue until manually stopped (Ctrl+C)
```

#### Option C: Custom Schedule

```bash
# Set custom schedule in .env
ATP_CRON_SCHEDULE="0 */6 * * *"  # Every 6 hours
ATP_CRON_SCHEDULE="0 9,15,21 * * *"  # 9 AM, 3 PM, 9 PM daily

# Then start scheduler
tsx examples/atp-investment-agent/scheduler.ts
```

## Architecture

### LangGraph Workflow (5 Nodes)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Portfolio       │───▶│ Agent           │───▶│ Investment      │
│ Analysis        │    │ Discovery       │    │ Decision        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐            │
│ Telegram        │◀───│ Investment      │◀───────────┘
│ Notifier        │    │ Executor        │
└─────────────────┘    └─────────────────┘
```

### Component Structure

```
examples/atp-investment-agent/
├── README.md                    # This documentation
├── env.example                  # Environment template
├── index.ts                     # One-time execution entry point
├── scheduler.ts                 # Scheduled execution entry point ⭐ NEW
├── atp-investment-agent.ts      # Main LangGraph orchestrator
├── services/
│   └── atp-scheduler.ts         # Cron scheduling service ⭐ NEW
├── agents/
│   ├── portfolio-analysis.ts    # Portfolio and balance analysis
│   ├── agent-discovery.ts       # ATP agent discovery
│   ├── investment-decision.ts   # Investment selection logic
│   ├── investment-executor.ts   # Real transaction execution
│   ├── telegram-notifier.ts     # Notification service
│   └── index.ts                 # Agent exports
└── utils/
    └── wallet-utils.ts          # Wallet and IQ token utilities
```

## Scheduling Configuration

### Cron Schedule Format

The `ATP_CRON_SCHEDULE` environment variable uses standard cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌─────────── hour (0 - 23)
│ │ ┌───────── day of month (1 - 31)
│ │ │ ┌─────── month (1 - 12)
│ │ │ │ ┌───── day of week (0 - 6) (Sunday=0)
│ │ │ │ │
* * * * *
```

### Common Schedule Examples

```bash
# Every 3 hours (default)
ATP_CRON_SCHEDULE="0 */3 * * *"

# Every 6 hours
ATP_CRON_SCHEDULE="0 */6 * * *"

# Twice daily (9 AM and 9 PM)
ATP_CRON_SCHEDULE="0 9,21 * * *"

# Once daily at midnight
ATP_CRON_SCHEDULE="0 0 * * *"

# Every weekday at 2 PM
ATP_CRON_SCHEDULE="0 14 * * 1-5"

# Every Sunday at 6 AM
ATP_CRON_SCHEDULE="0 6 * * 0"
```

### Scheduler Commands

```bash
# Start continuous scheduler
tsx examples/atp-investment-agent/scheduler.ts

# Run once and exit
tsx examples/atp-investment-agent/scheduler.ts --once

# Enable dry run mode
ATP_DRY_RUN=true tsx examples/atp-investment-agent/scheduler.ts

# Custom minimum investment
ATP_MIN_INVESTMENT=50 tsx examples/atp-investment-agent/scheduler.ts
```

### Production Deployment

For production deployment, consider using:

1. **Process Manager** (PM2):

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start "tsx examples/atp-investment-agent/scheduler.ts" --name "atp-agent"

# Monitor
pm2 monit

# Auto-restart on system reboot
pm2 startup
pm2 save
```

2. **Docker Container**:

```dockerfile
FROM node:22
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build
CMD ["tsx", "examples/atp-investment-agent/scheduler.ts"]
```

3. **Systemd Service** (Linux):

```bash
# Create service file
sudo nano /etc/systemd/system/atp-agent.service

# Start and enable
sudo systemctl start atp-agent
sudo systemctl enable atp-agent
```

## MCP Integration

### ATP MCP Tools Used

- `ATP_AGENT_STATS` - Fetch agent performance metrics
- `ATP_GET_AGENT_POSITIONS` - Get current holdings
- `ATP_BUY_AGENT` - Execute real purchases
- `ATP_SELL_AGENT` - Execute sales (future use)
- `ATP_ADD_AGENT_LOG` - Add audit trail entries

### Telegram MCP Tools Used  

- `send_message` - Send notifications
- `forward_message` - Forward reports
- `get_updates` - Check message status

## Workflow Details

### 1. Portfolio Analysis Agent

- Reads IQ balance from Fraxtal blockchain using viem
- Calculates 1% investment amount for safety
- Retrieves current ATP holdings via MCP
- Validates sufficient funds for investment

### 2. Agent Discovery Agent

- Fetches top-performing ATP agents
- Analyzes performance metrics and trends
- Ranks agents by ROI, volume, and stability
- Filters based on minimum performance criteria

### 3. Investment Decision Agent  

- Evaluates portfolio diversification
- Applies risk management rules
- Selects optimal agent for investment
- Considers market conditions and timing

### 4. Investment Executor Agent

- Executes real ATP purchase transactions
- Validates transaction success
- Records transaction details for audit
- Handles errors and retry logic

### 5. Telegram Notifier Agent

- Compiles comprehensive investment report
- Includes transaction details and performance data
- Sends formatted notification to Telegram
- Handles notification delivery errors

## Safety & Risk Management

### Investment Limits

- **Maximum Investment**: 1% of total IQ balance per cycle
- **Minimum Investment**: 10 IQ (configurable via `ATP_MIN_INVESTMENT`)
- **Balance Buffer**: Maintains 1.1x investment amount for gas fees
- **Frequency Limit**: Maximum every 3 hours via scheduler

### Validation Checks

- Wallet balance verification before investment
- ATP agent existence and performance validation
- Transaction success confirmation
- Network connectivity and API availability

### Error Handling

- Graceful failure recovery without data loss
- Comprehensive error logging and notifications  
- Automatic retry for transient failures
- Safe shutdown on critical errors

### Monitoring

- Real-time status updates in console
- Telegram notifications for all activities
- Execution time tracking and performance metrics
- Historical transaction logging

## Troubleshooting

### Common Issues

**Scheduler Not Starting**

```bash
# Check environment variables
tsx examples/atp-investment-agent/scheduler.ts --once

# Enable debug mode
DEBUG=true tsx examples/atp-investment-agent/scheduler.ts
```

**MCP Connection Failed**

```bash
# Verify API keys and tokens
cat .env

# Test ATP MCP manually
pnpm dlx @iqai/mcp-atp

# Test Telegram MCP manually  
npx -y @smithery/cli@latest run @NexusX-MCP/telegram-mcp-server
```

**Insufficient Balance**

- Ensure wallet has > 100 IQ minimum
- Check Fraxtal network connectivity
- Verify private key has correct format

**Investment Cycle Skipped**

- Check minimum investment threshold
- Verify market conditions
- Review portfolio diversification rules

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true tsx examples/atp-investment-agent/scheduler.ts
```

### Logs and Monitoring

The scheduler provides comprehensive logging:

- ⏰ Schedule information and timing
- 🔍 Pre-flight checks and validation
- 💰 Wallet balance and investment calculations  
- 🚀 Workflow execution progress
- ✅ Transaction confirmations and results
- ❌ Error details and recovery actions

## Development

### Testing with Dry Run

```bash
# Enable dry run mode
ATP_DRY_RUN=true tsx examples/atp-investment-agent/scheduler.ts --once

# All operations will be simulated without real transactions
```

### Extending the Agent

To add new functionality:

1. **New Workflow Nodes**: Add agents in `agents/` directory
2. **Custom Tools**: Integrate additional MCP servers
3. **Alternative Scheduling**: Modify `services/atp-scheduler.ts`
4. **Enhanced Notifications**: Extend `agents/telegram-notifier.ts`

## Support

For issues and questions:

- Review error logs and debug output
- Check environment configuration
- Verify API keys and network connectivity
- Test with dry run mode first

## License

MIT License - See LICENSE file for details.

---

**⚠️ DISCLAIMER**: This software is provided as-is for educational and research purposes. Users are responsible for understanding the risks and complying with applicable regulations. Always test with small amounts and use dry run mode for development.
