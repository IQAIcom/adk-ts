<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>

# create-adk-project

**A CLI for scaffolding ADK TypeScript projects from official starter templates**

_Interactive Setup • Multiple Templates • Project Scaffolding • Ready-to-Run Examples_

<p align="center">
  <a href="https://www.npmjs.com/package/create-adk-project">
    <img src="https://img.shields.io/npm/v/create-adk-project" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/create-adk-project">
    <img src="https://img.shields.io/npm/dm/create-adk-project" alt="NPM Downloads" />
  </a>
  <a href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md">
    <img src="https://img.shields.io/npm/l/create-adk-project" alt="License" />
  </a>
</p>

---

</div>

## 🌟 Overview

`create-adk-project` is the official CLI for bootstrapping new ADK TypeScript projects. It lets you choose from a set of production-ready templates, sets up your project, installs dependencies, and gets you started in seconds.

## 🚀 Usage

You can get started in two ways:

- **Create a new project with our CLI:**

```bash
npx create-adk-project
```

- **Or install globally:**

```bash
npm install -g create-adk-project
create-adk-project
```

## 📦 Available Templates

The current templates include:

- **Simple Agent** — Minimal agent starter
- **MCP Server** — Model Context Protocol server starter
- **Hono Server** — API server starter (Hono.js)
- **Telegram Bot** — Telegram agent bot starter
- **Discord Bot** — Discord agent bot starter

You can find them in the [`apps/starter-templates`](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates) directory of the ADK-TS repository.

## 🛠️ Interactive Setup

When you run `create-adk-project`, you'll be guided through an interactive setup:

1. **Project Name**: Choose a name for your project.
2. **Template Selection**: Pick a template to scaffold your project.
3. **Install dependencies**: Choose whether to install dependencies automatically.
4. **Package Manager**: Select your preferred package manager (npm, pnpm, yarn).
5. **Project Scaffolding**: The CLI will create the project structure, install dependencies, and set up example code.

## 🛠️ Features

- Interactive prompts (project name, template, package manager)
- Beautiful CLI interface with ASCII art
- Smart package manager detection (npm, pnpm, yarn, bun)
- Fast project scaffolding from official templates
- Automatic dependency installation
- Ready-to-run example code for each template
