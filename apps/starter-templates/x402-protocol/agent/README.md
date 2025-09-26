# ADK-TS x402 Agent

AI agent built with ADK-TS that accesses IQ AI's ATP through paid endpoints using x402 protocol.

## Features

- **ATP Integration**: Get agent holdings, stats, and market data
- **Automatic Payments**: Uses x402-axios for micropayments
- **Price Transparency**: Shows endpoint costs upfront
- **Web Interface**: Interactive chat interface

## Setup

1. Create `.env` file:

```env
ADK_DEBUG=false # Enable debug mode
WALLET_PRIVATE_KEY=your_wallet_private_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

2. Start agent:

```bash
pnpm dev
```

Access at `https://adk-web.iqai.com`

## Tools

- `GET_PRICES` - Get endpoint pricing (free)
- `GET_HOLDINGS` - Get wallet holdings ($0.05)
- `GET_AGENT_INFO` - Get agent metadata ($0.05)
- `GET_AGENT_STATS` - Get agent stats ($0.05)
- `GET_TOP_AGENTS` - Get top agents list ($0.10)
