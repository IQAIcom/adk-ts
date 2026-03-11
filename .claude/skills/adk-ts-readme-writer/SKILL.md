---
name: adk-readme-writer
description: "ADK-TS README specialist. Use when creating or editing any README.md file in the monorepo, adding new packages, apps, or starter templates. Knows the four branded README archetypes (root, package, app/contributor, starter template) and enforces consistency."
---

# ADK-TS README Writer

## Overview

This skill creates and updates README files that match the exact branded patterns used across the ADK-TS monorepo. There are four distinct README archetypes — choose the correct one based on where the README lives.

## When to Use

- Creating a new README for a package, app, or starter template
- Editing an existing README
- Adding a new package or starter template to the monorepo
- Reviewing READMEs for consistency

## Before Writing

1. Read the target directory's `package.json` to extract the package name, description, and version
2. Identify which archetype applies (see below)
3. Read the canonical reference README for that archetype
4. Apply the `adk-style-guide` skill rules (brand, terminology, URLs)

---

## Archetype 1: Root README

**Applies to:** `README.md` (repository root)

**Reference file:** `README.md`

**Structure:**

```markdown
<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS: The TypeScript-Native AI Agent Framework</h1>
  <b>An open-source framework for building production-ready AI agents in TypeScript. Type-safe, multi-LLM, with built-in tools, sessions, and agent orchestration.</b>
  <br/>
  <i>TypeScript-Native • Multi-Agent Systems • Production-Ready</i>

  <p align="center">
    <a href="https://www.npmjs.com/package/@iqai/adk">
      <img src="https://img.shields.io/npm/v/@iqai/adk" alt="NPM Version" />
    </a>
    <a href="https://www.npmjs.com/package/@iqai/adk">
      <img src="https://img.shields.io/npm/dm/@iqai/adk" alt="NPM Downloads" />
    </a>
    <a href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md">
      <img src="https://img.shields.io/npm/l/@iqai/adk" alt="License" />
    </a>
    <a href="https://github.com/IQAIcom/adk-ts">
      <img src="https://img.shields.io/github/stars/IQAIcom/adk-ts?style=social" alt="GitHub Stars" />
    </a>
  </p>
</div>

---

## 🌟 Overview

## 🚀 Key Features (emoji + link + description bullets)

## ⚡ Quick Start (CLI + manual approaches)

## 📚 Examples

## 🤝 Contributing

## 🌍 Community

## 📜 License

## 🔒 Security

---

**Ready to build your first AI agent?** Visit [https://adk.iqai.com](https://adk.iqai.com) to get started!
```

**Key traits:**

- Most comprehensive README — acts as project landing page
- Logo width: 80
- Includes NPM badges
- Community section with GitHub Discussions link
- Security section referencing SECURITY.md

---

## Archetype 2: Package README

**Applies to:** `packages/adk/README.md`, `packages/adk-cli/README.md`, `packages/mcp-docs/README.md`

**Reference file:** `packages/adk/README.md`

**Structure:**

```markdown
<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>{NPM_PACKAGE_NAME}</h1>
  <b>{PACKAGE_DESCRIPTION}</b>
  <br/>
  <i>{Keyword} • {Keyword} • {Keyword}</i>

  <p align="center">
    <a href="https://www.npmjs.com/package/{NPM_PACKAGE}">
      <img src="https://img.shields.io/npm/v/{NPM_PACKAGE}" alt="NPM Version" />
    </a>
    <a href="https://www.npmjs.com/package/{NPM_PACKAGE}">
      <img src="https://img.shields.io/npm/dm/{NPM_PACKAGE}" alt="NPM Downloads" />
    </a>
    <a href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md">
      <img src="https://img.shields.io/npm/l/{NPM_PACKAGE}" alt="License" />
    </a>
    <a href="https://github.com/IQAIcom/adk-ts">
      <img src="https://img.shields.io/github/stars/IQAIcom/adk-ts?style=social" alt="GitHub Stars" />
    </a>
  </p>
</div>

---

## 🌟 Overview

## 🚀 Key Features (emoji + **bold title** + description)

## 🚀 Quick Start (installation + simple example)

## ⚙️ Environment Configuration

## 📖 Basic Usage (code examples)

## 📚 Documentation (link to adk.iqai.com)

## 🤝 Contributing

## 📜 License
```

**Key traits:**

- Logo width: **80** (consistent across all READMEs)
- `<h1>` uses the npm package name (e.g., `@iqai/adk`)
- Includes NPM badges with package-specific URLs
- Code examples use TypeScript with `@iqai/adk` imports
- Quick Start shows `npm install` command

---

## Archetype 3: App / Contributor README

**Applies to:** `apps/docs/README.md`, `apps/examples/README.md`, `apps/adk-web/README.md`, `apps/adk-api-docs/README.md`

**Reference files:** `apps/docs/README.md`, `apps/adk-web/README.md`

**Structure:**

```markdown
<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>{APP_DISPLAY_NAME}</h1>
  <b>{Contributing guide for... | A collection of...}</b>
  <br/>
  <i>{Keyword} • {Keyword} • {Keyword} • {Keyword}</i>
</div>

---

## 📖 About

{For contributor guides:}
This README is specifically for contributors to {component}. ...
If you're looking to **use** {component}, visit {link}. This guide is for those who want to **contribute** to improving {it}.

{For collections like examples:}
This directory contains {description of what's inside}.

## 🌟 Features (what the app provides)

## 🚀 Getting Started

### Prerequisites

### Setting Up Development Environment

## ⚙️ Architecture Overview

## 📁 Project Structure

## 🛠️ Development Workflow

## 🧪 Testing

## 🤝 Contributing

---

**Ready to contribute?** {Encouraging CTA}
```

**Key traits:**

- Logo width: 80
- **NO NPM badges** (these are not published packages)
- **NO `<p align="center">` badge block**
- Opens with contributor-oriented or collection-oriented intro
- More detailed on internal architecture and dev workflows
- References internal tooling (Fumadocs, TypeDoc, NestJS, etc.)
- Keywords in `<i>` tag are workflow-oriented: "Setup • Development • Testing • Contributing"

---

## Archetype 4: Starter Template README

**Applies to:** All files in `apps/starter-templates/*/README.md`

**Reference file:** `apps/starter-templates/simple-agent/README.md`

**Structure:**

```markdown
<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS {Template Name} Template</h1>
  <b>Starter template for {what it does} with ADK-TS</b>
  <br/>
  <i>{Keyword} • {Keyword} • {Keyword}</i>
</div>

---

# {Template Name} Template - {Subtitle}

{One paragraph description.}

**Built with [ADK-TS](https://adk.iqai.com/) - The TypeScript-Native AI Agent Framework**

## 🎯 Features

- **{Feature name}** {description}.
- **{Feature name}** {description}.

## 🏗️ How It Works

` ` `text
{ASCII flow diagram showing the agent architecture}
` ` `

## 🚀 Quick Start

Use either approach:

- **Recommended**: scaffold a fresh project with the ADK-TS CLI.
- **Alternative**: clone the repository and copy this template folder into your own project.

### Prerequisites

- Node.js >=22.0
- pnpm
- {Template-specific requirements}

### Step 1: Create the project

` ` `bash
npx @iqai/adk-cli new --template {TEMPLATE_NAME} my-{template}
cd my-{template}
` ` `

### Step 2: Install dependencies

` ` `bash
pnpm install
` ` `

### Step 3: Configure environment variables

` ` `bash
cp .env.example .env
` ` `

Required and optional values are documented in `.env.example`.

### Step 4: Run the template

` ` `bash
pnpm dev
` ` `

## 📁 Template Structure

` ` `text
src/
├── agents/                 # Agent definitions
│   ├── agent.ts            # Root agent
│   └── {sub-agents}/       # Specialist agents
├── env.ts                  # Environment validation
└── index.ts                # Entry point
` ` `

## 🧪 Test with ADK-TS CLI

From your project directory, you can test agents without writing custom test scripts.

` ` `bash

# Option 1: Install ADK-TS CLI globally, then run

pnpm install -g @iqai/adk-cli
adk run
adk web

# Option 2: Use npx without global install

npx @iqai/adk-cli run
npx @iqai/adk-cli web
` ` `

- `adk run`: interactive terminal chat with your agent(s).
- `adk web`: launches a local server and opens the ADK-TS web interface.

## 📚 Learn More

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAIcom/adk-ts)
- [ADK-TS Sample Projects](https://github.com/IQAIcom/adk-ts-samples)
- [GitHub Discussions](https://github.com/IQAIcom/adk-ts/discussions)
- [Telegram Community](https://t.me/+Z37x8uf6DLE3ZTQ8)

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/{TEMPLATE_NAME}) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to start building {type} applications with ADK-TS.
```

**Key traits:**

- Logo width: 80
- **NO NPM badges**
- Title format: "ADK-TS {Template Name} Template"
- Always includes "Built with ADK-TS" line after intro
- "How It Works" ASCII diagram is required
- Quick Start is a rigid 4-5 step format
- "Test with ADK-TS CLI" section is **identical across all templates**
- "Learn More" links are **identical across all templates**
- Contributing section only differs in template folder path

---

## Shared Boilerplate Sections (Starter Templates)

These sections MUST be identical across all starter templates (only template-specific values change):

1. **Quick Start intro paragraph** (identical)
2. **Step 2: Install dependencies** (identical)
3. **Step 3: Configure environment variables** (identical)
4. **Test with ADK-TS CLI** section (verbatim identical)
5. **Learn More** links (identical base set)
6. **Contributing** section (identical pattern, only folder path differs)

When updating any of these shared sections, update ALL starter templates. Use `/adk-starter-sync` command for this.

---

## Consistency Rules

All READMEs must follow these rules (from `adk-style-guide`):

- GitHub URL org: `IQAIcom` (not `IQAICOM`)
- Node.js version: `>=22.0`
- Docs URL: `https://adk.iqai.com/`
- Logo: `https://files.catbox.moe/vumztw.png`
- GitHub Discussions: `https://github.com/IQAIcom/adk-ts/discussions`
- Telegram: `https://t.me/+Z37x8uf6DLE3ZTQ8`
- Samples: `https://github.com/IQAIcom/adk-ts-samples`
- Always "ADK-TS" never bare "ADK"
- Never expand to "Agent Development Kit"
