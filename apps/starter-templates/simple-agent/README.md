
<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>



# ADK Simple Agent Starter

**A starter template to build your own agent with the `@iqai/adk` library.**

_Minimal • Extensible • TypeScript_

---

</div>

This is the recommended starter template for building your own agent with the ADK TypeScript framework.

## 🚀 Get Started


The easiest way to create a new project using this template is with the ADK CLI:

```bash
npm install -g @iqai/adk-cli # if you haven't already
adk new --template simple-agent my-agent-project
cd my-agent-project
pnpm install
```

You can also use this template directly by copying the files, but using the CLI is recommended for best results.

### Running the Agent

**Default (Production/Development) Route**

To run your agent in production or for standard development, use:
```bash
pnpm dev
```

**Fast Iteration & Agent Setup (ADK CLI)**

For rapid prototyping, interactive testing, or initial agent setup, use the ADK CLI:
```bash
adk run   # Interactive CLI chat with your agents
adk web   # Web interface for easy testing and demonstration
```

## 📁 Folder Structure
The main agent code lives in `index.ts` where the subagents live inside the `agents` folder. The `agents/agent.ts` file is compatible with the ADK CLI for easy testing.

```
├── src/
│   ├── agents/
│   │   ├── agent.ts          # Root agent (ADK CLI compatible)
│   │   ├── joke-agent/       # Joke-telling sub-agent
│   │   │   ├── agent.ts
│   │   │   └── tools.ts
│   │   └── weather-agent/    # Weather information sub-agent
│   │       ├── agent.ts
│   │       └── tools.ts
│   ├── env.ts                # Environment variable validation
│   └── index.ts              # Main execution entry point
```

## ⚙️ Environment Setup
Make sure to configure your environment variables:

```bash
cp .env.example .env
```

## 🧰 Dev Tools
This starter includes:
- **GitHub Actions**: CI/CD pipeline
- 📦 **PNPM**: Fast package manager
- 🤖 **ADK CLI**: Interactive testing with `adk run` and `adk web`

## 🧪 Testing Your Agent

**Traditional Testing**: Run `pnpm dev` to execute the sample questions.

**Interactive Testing with ADK CLI**:
1. Install: `npm install -g @iqai/adk-cli`
2. Run: `adk run` for CLI chat or `adk web` for web interface
3. Perfect for development, testing, and demonstrating your agent's capabilities

## 🏗️ Building Your Agent
1. **Create new agents** in the `src/agents/` directory
2. **Add tools** to your agents in the `tools/` subdirectory
3. **Configure services** in the `src/services/` directory
4. **Update environment** variables in `src/env.ts`

## 📚 Links
- [ADK Documentation](https://adk.iqai.com)
- [ADK GitHub Repository](https://github.com/IQAIcom/adk-ts)

## 🆘 Support
If you encounter any issues or have questions:
- 📝 [Create an issue](https://github.com/IQAIcom/adk-ts/issues)
- 💬 [Start a discussion](https://github.com/IQAIcom/adk-ts/discussions)