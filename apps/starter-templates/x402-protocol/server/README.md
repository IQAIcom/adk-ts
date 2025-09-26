# ADK-TS x402 Payment Server

HTTP server that proxies IQ AI's ATP API with x402 micropayment protection.

## Features

- **Payment Protection**: x402 middleware for all ATP endpoints
- **Transparent Pricing**: `/api/price-list` shows costs
- **IQAI ATP Proxy**: Direct access to agent data
- **Base Sepolia**: Built for Base network

## Setup

1. Create `.env` file:

```env
FACILITATOR_URL="https://x402.org/facilitator"
ADDRESS=your_wallet_address_here # Your wallet address (to receive payments)
NETWORK=base-sepolia
```

2. Start server:

```bash
pnpm dev
```

Server runs on `http://localhost:3001`

## Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/price-list` | Free | Get endpoint pricing information |
| `/api/prices` | $0.01 | Get current token prices |
| `/api/holdings` | $0.05 | Get wallet holdings for IQ AI agents |
| `/api/agents/info` | $0.05 | Get agent metadata by contract address |
| `/api/agents/stats` | $0.05 | Get agent performance statistics |
| `/api/agents/top` | $0.10 | Get top agents by various metrics |
