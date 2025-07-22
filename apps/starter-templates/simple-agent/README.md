# 🤖 ADK Agent Starter

This is a starter template to start building your own agent with `@iqai/adk` library. 

## 🚀 Get Started
Start by cloning the repository or clicking on use as template button on github ui. 

```bash
git clone https://github.com/IQAICOM/adk-agent-starter.git
```

📦 Install the dependencies

```bash
pnpm install
```

▶️ Run the agent

```bash
pnpm dev
```

## 📁 Folder Structure
The main agent code lives in `index.ts` where the subagents live inside the `agents` folder. The agents can have tools which reside in the `tools` folder.

```
├── src/
│   ├── agents/
│   │   └── financial-agent/
│   │       ├── index.ts
│   │       └── tools/
│   │           └── currency-converter-tool.ts
│   ├── services/
│   │   └── wallet.ts
│   ├── env.ts
│   └── index.ts
```

## ⚙️ Environment Setup
Make sure to configure your environment variables:

```bash
cp .env.example .env
```

## 🧰 Dev Tools
This starter includes:
-  **GitHub Actions**: CI/CD pipeline
- 📦 **PNPM**: Fast package manager

## 🏗️ Building Your Agent
1. **Create new agents** in the `src/agents/` directory
2. **Add tools** to your agents in the `tools/` subdirectory
3. **Configure services** in the `src/services/` directory
4. **Update environment** variables in `src/env.ts`

## 📚 Links
- [ADK Library](https://github.com/IQAICOM/adk-ts)

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License
MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support
If you encounter any issues or have questions:
- 📝 [Create an issue](https://github.com/IQAICOM/adk-agent-starter/issues)