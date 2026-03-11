---
name: adk-style-guide
description: "ADK-TS brand voice, terminology, and writing conventions. Use when writing any documentation, READMEs, changelogs, blog posts, or technical content for the ADK-TS project. Also use when reviewing content for brand and style consistency."
---

# ADK-TS Style Guide

## Overview

This skill enforces ADK-TS brand identity, terminology, voice, and formatting conventions across all written content in the monorepo. It applies to documentation pages, READMEs, changelogs, code comments, and any developer-facing text.

## When to Use

- Writing or editing any `.md` or `.mdx` file in the repo
- Creating changelogs or release notes
- Writing code comments or docstrings that reference ADK-TS
- Reviewing content for consistency

---

## Brand Identity & Positioning

### Naming Rules (Critical)

| Rule                     | Correct                      | Incorrect                                                   |
| ------------------------ | ---------------------------- | ----------------------------------------------------------- |
| Framework name           | **ADK-TS**                   | ADK, adk-ts, ADK TS, Adk-Ts                                 |
| Never expand the acronym | ADK-TS                       | Agent Development Kit, Agent Development Kit for TypeScript |
| CLI references           | **ADK-TS CLI**               | adk CLI, the CLI, ADK CLI                                   |
| Package names in code    | `@iqai/adk`, `@iqai/adk-cli` | These are acceptable as-is (they are npm identifiers)       |

### Tagline & Description

- **Tagline:** "The TypeScript-Native AI Agent Framework"
- **Short description:** "An open-source framework for building production-ready AI agents in TypeScript"
- People do not need to know what ADK-TS stands for. Just reference it as **ADK-TS**.

### SEO-Aligned Language

Use these terms naturally in content:

- "TypeScript AI agents"
- "TypeScript agent framework"
- "build AI agents in TypeScript"
- "AI agent orchestration in TypeScript"

Avoid leading with these (they pull into Google's ADK space):

- "Agent Development Kit"
- "ADK" alone

---

## Terminology

Always use these exact terms:

| Correct Term   | Avoid                                                       |
| -------------- | ----------------------------------------------------------- |
| agent          | bot (unless literally a bot template like Telegram/Discord) |
| tool           | function (when referring to agent capabilities)             |
| session        | conversation (for the persistence layer)                    |
| runner         | executor (for the agent runner)                             |
| MCP server     | MCP plugin, MCP integration                                 |
| `AgentBuilder` | agent builder (lowercase, when referring to the class)      |
| `LlmAgent`     | LLM agent (lowercase, when referring to the class)          |

---

## Voice & Tone

- **Professional but approachable** — not stiff, not casual
- **Developer-centric** — assume TypeScript fluency
- **Action-oriented** — use imperative verbs: "Create", "Install", "Run", "Build"
- **Concise** — lead with the answer, skip filler words
- **Encouraging** — end sections with "Ready to build?" or "Ready to contribute?"

---

## Formatting Conventions

### Headings

- H1 (`#`) for page title only — one per file
- H2 (`##`) for major sections
- H3 (`###`) for subsections
- Use emoji prefix for README section headings (e.g., `## 🚀 Quick Start`)
- No emoji in docs site MDX headings (Fumadocs handles styling)

### Code Blocks

- Always specify language: ` ```typescript ` or ` ```bash `
- Never use ` ```js ` — always ` ```typescript `

### Feature Lists

Use this pattern in READMEs:

```markdown
- **🤖 Multi-Provider LLM Support** - Seamlessly integrate OpenAI, Anthropic, Google, and other providers
- **🛠️ Extensible Tool System** - Define custom tools with declarative schemas
```

### Configuration Tables

Use this column structure:

```markdown
| Property | Type     | Required | Description              |
| -------- | -------- | -------- | ------------------------ |
| `name`   | `string` | Yes      | The agent's display name |
```

---

## Code Example Conventions

- Always TypeScript (never JavaScript)
- Import from `@iqai/adk` (never relative paths in documentation)
- Use `AgentBuilder` for simple/introductory examples
- Use `new LlmAgent({...})` for advanced configuration examples
- Include `dotenv` setup when environment variables are needed
- Default model: `gemini-2.5-flash` (Gemini is the default LLM — use it in most examples). Other supported: `gpt-4.1`, `claude-sonnet-4-5`

### Simple Example Pattern

```typescript
import { AgentBuilder } from "@iqai/adk";

const response = await AgentBuilder.withModel("gemini-2.5-flash").ask(
  "What is the primary function of an AI agent?",
);
```

### Advanced Example Pattern

```typescript
import { LlmAgent } from "@iqai/adk";

const agent = new LlmAgent({
  name: "my-agent",
  model: "gemini-2.5-flash",
  instruction: "You are a helpful assistant",
  tools: [myTool],
});
```

---

## Canonical URLs

Use these exact URLs everywhere — no variations:

| Resource                        | URL                                             |
| ------------------------------- | ----------------------------------------------- |
| GitHub repo                     | `https://github.com/IQAIcom/adk-ts`             |
| GitHub Discussions              | `https://github.com/IQAIcom/adk-ts/discussions` |
| Telegram (ADK-TS / IQ Builders) | `https://t.me/+Z37x8uf6DLE3ZTQ8`                |
| Telegram (IQ AI company)        | `https://t.me/IQAICOM`                          |
| Documentation site              | `https://adk.iqai.com/`                         |
| NPM package                     | `https://www.npmjs.com/package/@iqai/adk`       |
| Sample projects                 | `https://github.com/IQAIcom/adk-ts-samples`     |
| Logo image                      | `https://files.catbox.moe/vumztw.png`           |

**Telegram link usage:** Use the ADK-TS / IQ Builders link (`+Z37x8uf6DLE3ZTQ8`) in framework docs, READMEs, and developer-facing content. Use the IQ AI company link (`IQAICOM`) only for company-level references (e.g., SECURITY.md).

**GitHub org casing:** Always `IQAIcom` (NOT `IQAICOM` or `iqaicom`)

### Internal Doc Links

- Framework docs: `/docs/framework/...`
- CLI docs: `/docs/cli/...`
- MCP docs: `/docs/mcp-servers/...`

---

## Constants

- **Node.js version requirement:** `>=22.0` (not `18+` — this is the monorepo standard)
- **Package manager:** `pnpm` (always mention pnpm first in multi-manager examples)
- **License:** MIT

---

## Checklist for Content Review

When reviewing any content, verify:

- [ ] Uses "ADK-TS" not bare "ADK"
- [ ] Never expands to "Agent Development Kit"
- [ ] CLI referenced as "ADK-TS CLI"
- [ ] GitHub URLs use `IQAIcom` casing
- [ ] Node.js version is `>=22.0`
- [ ] Code examples use TypeScript with `@iqai/adk` imports
- [ ] Model names are current (not deprecated)
- [ ] Canonical URLs are correct
- [ ] Tone is professional but approachable
- [ ] Headings follow hierarchy (H1 → H2 → H3)
