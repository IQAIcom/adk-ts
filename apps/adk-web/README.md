<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS Web</h1>
  <b>Contributing guide for the ADK-TS Web UI</b>
  <br/>
  <i>Setup • Development • Testing • Contributing</i>
</div>

---

## 📖 About

This README is specifically for contributors to the ADK-TS Web application. ADK-TS Web is a Next.js application that provides a visual, browser-based interface for the `@iqai/adk-cli` server, allowing users to browse agents, chat in real-time, and monitor server connectivity.

If you're looking to **use** the ADK-TS Web UI, it's automatically launched via `adk web` command from the CLI. This guide is for those who want to **contribute** to improving the web interface.

## 🌟 Features

The ADK-TS Web UI provides:

- **Agent Discovery** - Visual browser for discovered agents with selection
- **Interactive Chat** - Real-time chat panel with message history
- **Session Management** - Create, switch, and manage agent sessions
- **Event Monitoring** - Track and filter agent events in real-time
- **State Inspection** - View and edit agent state with JSON editor
- **Connection Status** - Server connectivity monitoring with auto-retry
- **Graph Visualization** - Visual representation of agent relationships

## ⚙️ Architecture Overview

The web application uses:

- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[React Query (TanStack Query)](https://tanstack.com/query)** - Data fetching and state management
- **[shadcn/ui](https://ui.shadcn.com)** - UI component library
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[Lucide React](https://lucide.dev)** - Icon library
- **[React Flow](https://reactflow.dev)** - Graph visualization
- **[Zod](https://zod.dev)** - Schema validation

### Project Structure

```
apps/adk-web/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Dashboard layout and pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page (redirects to dashboard)
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── ai-elements/      # Chat/conversation components
│   └── *-panel.tsx       # Feature panels (agents, chat, events, etc.)
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
└── Api.ts                # Generated OpenAPI client
```

## 🔌 How It Works

### API Communication

- The UI reads connection details from URL query parameters:
  - `port` (preferred): server port, defaults to `8042`
  - `apiUrl` (legacy): full URL to the API server
- Requests are made using the generated OpenAPI client in [Api.ts](Api.ts)
- React Query hooks manage data fetching and caching in [hooks/](hooks/)
- Key endpoints:
  - `GET /api/agents` – List discovered agents
  - `POST /api/agents/:relativePath/message` – Send messages to agents
  - `GET /api/sessions` – Get agent sessions
  - `GET /api/events` – Stream agent events
  - `GET /api/state` – Get/update agent state

### State Management

- **React Query** handles server state (agents, sessions, events)
- **URL state** stores API connection details via `port` parameter (or legacy `apiUrl`)
- **Local state** manages UI interactions (dialogs, selections, filters)

### Real-time Updates

- Events are fetched periodically using React Query's polling
- Sessions and state updates trigger automatic refetches
- Optimistic updates provide instant UI feedback

## 🚀 Getting Started

### Prerequisites

Before contributing to ADK-TS Web, ensure you have:

- **[Node.js](https://nodejs.org)** (version 18 or later)
- **[pnpm](https://pnpm.io)** (recommended package manager)
- Basic familiarity with [Next.js](https://nextjs.org), [React](https://react.dev), and [TypeScript](https://www.typescriptlang.org)

### Setting Up Development Environment

1. **Clone the repository** (if you haven't already):

   ```bash
   git clone https://github.com/IQAIcom/adk-ts.git
   cd adk-ts
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Navigate to the adk-web directory**:

   ```bash
   cd apps/adk-web
   ```

4. **Start the development server**:

   ```bash
   pnpm dev
   ```

5. **View the web UI** at [http://localhost:3000](http://localhost:3000)

The development server supports hot reloading, so changes to files will be reflected immediately in your browser.

### Connecting to ADK-TS CLI Server

To fully test the web interface, you need a running ADK-TS CLI server:

1. **In a separate terminal**, navigate to the starter-templates directory and start the ADK-TS CLI server:

   ```bash
   # From the starter-templates directory ( contains all testable agents)
   cd apps/starter-templates
   adk run

   # Or cd into a specific agent to test it individually
   cd apps/starter-templates/simple-agent
   adk run
   ```

2. **Connect the web UI** to the server:

   Visit [http://localhost:3000](http://localhost:3000) in your browser. The web UI will automatically detect the running ADK-TS CLI server on the default port.

### Building for Production

Test your changes by building the application:

```bash
pnpm build
```

To run the production build locally:

```bash
pnpm start
```

### Linting and Formatting

This project uses **[Biome](https://biomejs.dev)** for linting and formatting

- Run `pnpm lint` from the root directory to check for issues
- Run `pnpm format` from the root directory to auto-format code

## 🧪 Testing Your Changes

When making changes, verify the affected functionality works correctly:

- **Agent Discovery** - Agents load and display correctly, selection updates the UI, and metadata displays properly
- **Chat Interface** - Messages send successfully, responses display correctly, and message history loads
- **Session Management** - Can create new sessions, switch between sessions, and delete sessions
- **Events Panel** - Events display in reverse chronological order (newest first) and filtering works correctly
- **State Panel** - State loads and displays, JSON editor validates input, and state updates save correctly
- **Connection Handling** - Connection status displays accurately, reconnection works when server restarts, and error messages are clear

### Testing Different Scenarios

```bash
# Test with different ports (preferred method)
http://localhost:3000/?port=8042
http://localhost:3000/?port=3001

# Test with custom API URL (legacy)
http://localhost:3000/?apiUrl=http://localhost:8042

# Test without server (should show connection error)
http://localhost:3000/
```

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Fix bugs** - Resolve UI issues or unexpected behavior
- **Add features** - Implement new functionality or improvements
- **Improve UI/UX** - Enhance the user interface and experience
- **Optimize performance** - Improve loading times and responsiveness
- **Update dependencies** - Keep packages up to date
- **Improve accessibility** - Make the UI more accessible
- **Add tests** - Increase test coverage (when testing framework is added)

### Contribution Workflow

1. **Fork the repository** on GitHub

2. **Create a feature branch** from main:

   ```bash
   git checkout -b feat/add-agent-search
   ```

3. **Make your changes** following the coding guidelines below

4. **Test locally** with `pnpm dev` and verify all functionality works

5. **Build for production** with `pnpm build` to ensure no build errors

6. **Commit your changes** with descriptive commit messages:

   ```bash
   git commit -m "feat: add search functionality to agents panel"
   ```

7. **Push to your fork** and **create a Pull Request**

### Coding Guidelines

- **Follow TypeScript best practices** - Use proper types, avoid `any`
- **Use existing UI components** - Leverage shadcn/ui components from `components/ui/`
- **Follow React patterns** - Use hooks, functional components, and proper state management
- **Keep components focused** - Single responsibility principle
- **Write clean code** - Use meaningful variable names and add comments for complex logic
- **Use Tailwind CSS** - Follow the existing styling patterns
- **Maintain accessibility** - Ensure ARIA labels and keyboard navigation work

## 📚 Related Packages

- **[@iqai/adk](../../packages/adk/)** – Core library for building agents
- **[@iqai/adk-cli](../../packages/adk-cli/)** – CLI that powers the server this app connects to

## 🔗 Resources

### Documentation

- **[ADK Documentation](https://adk.iqai.com)** - Official ADK documentation
- **[ADK-TS CLI Web Command](https://adk.iqai.com/docs/cli/commands#adk-web)** - Learn how to launch the web UI with `adk web`
- **[Next.js Docs](https://nextjs.org/docs)** - Next.js framework documentation
- **[React Query Docs](https://tanstack.com/query/latest)** - React Query documentation
- **[shadcn/ui](https://ui.shadcn.com)** - UI component documentation

### Getting Help

- **[Check existing issues](https://github.com/IQAIcom/adk-ts/issues)** for similar questions or problems
- **[Ask in discussions](https://github.com/IQAIcom/adk-ts/discussions)** for clarification on development topics
- **[Contributing Guide](../../CONTRIBUTION.md)** - Main project contribution guidelines

---

**Ready to contribute?** Start by exploring the codebase, running the development server, and making improvements. Your contributions help make ADK-TS Web a better tool for the AI agent development community!
