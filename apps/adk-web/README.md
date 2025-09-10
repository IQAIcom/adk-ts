<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="80" />

<br/>

# ADK Web

**Visual interface for the ADK (Agent Development Kit) CLI**

*Agent discovery • Interactive chat • Status monitoring*

---

</div>

## ⭐ Overview

ADK Web is a Next.js application that provides a visual, browser-based interface for the `@iqai/adk-cli` server. It helps you:

- Browse and select discovered agents
- Chat with agents in real-time
- Monitor server connectivity and status

This app is designed to be launched by the CLI via `adk web`, but it can also run locally for development.

## 🚀 Usage with ADK CLI

Install the CLI and start the web interface:

```bash
npm install -g @iqai/adk-cli

# Start the CLI server and open the web UI
adk web

# Or point to a specific server
adk web --port 8042
adk web --web-port 3000   # local dev port for the UI
```

The web app connects to the CLI server using a query parameter:

- `apiUrl` (legacy): full URL to the API server
- `port`: server port (defaults to `8042` when not provided)

Example direct URL: `http://localhost:3000/?port=8042`

## 🧩 Features

- Visual agent browser with selection
- Chat panel with message history
- Automatic agent auto-select on first load
- Server connection status and retry

## 🛠️ Local Development

From the monorepo root:

```bash
pnpm install
pnpm -w dev
```

Or inside this app directory:

```bash
pnpm dev
```

Open http://localhost:3000. To connect to a running CLI server, append `?port=8042` or `?apiUrl=http://localhost:8042`.

## 🔌 How it works

- The UI reads `apiUrl`/`port` from the URL (see `app/page.tsx`).
- Requests are proxied through `app/api/proxy/route.ts` to the ADK CLI server.
- Agent discovery and messaging use the CLI API:
	- `GET /api/agents` – list agents
	- `POST /api/agents/:relativePath/message` – send a message

The UI now uses the generated OpenAPI client in `Api.ts` directly via React Query inside hooks (see `hooks/useAgents.ts`, `useSessions.ts`, `useEvents.ts`, `useStatePanel.ts`).

## 📚 Related Packages

- `@iqai/adk` – core library for building agents
- `@iqai/adk-cli` – CLI that powers the server this app connects to

Docs: https://adk.iqai.com

## 🤝 Contributing

Contributions welcome. Please read the root [CONTRIBUTION.md](../../CONTRIBUTION.md).

## 📄 License

MIT – see [LICENSE](../../LICENSE.md)
