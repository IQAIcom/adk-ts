Synchronize shared boilerplate content across all starter template READMEs in `apps/starter-templates/*/README.md`.

## Context

The starter template READMEs share ~70% identical content. When any shared section is updated in one template, all others must be updated to match. This command identifies drift and propagates updates.

## Starter Templates

Discover all templates dynamically by listing directories in `apps/starter-templates/*/README.md`. Do NOT hardcode the list — new templates may be added at any time.

## Workflow

### Step 1: Read All Templates

Read all starter template READMEs in `apps/starter-templates/*/README.md` to understand the current state.

### Step 2: Identify Shared Sections

These sections MUST be kept in sync (with only template-specific substitutions):

#### A. Quick Start Intro (identical)

```markdown
Use either approach:

- **Recommended**: scaffold a fresh project with the ADK-TS CLI.
- **Alternative**: clone the repository and copy this template folder into your own project.
```

#### B. Prerequisites Base (identical base, template-specific extras appended)

```markdown
### Prerequisites

- Node.js >=22.0
- pnpm
- {TEMPLATE_SPECIFIC_REQUIREMENT if any}
```

#### C. Step 1 Pattern (only template name and project name differ)

```markdown
### Step 1: Create the project

` ` `bash
npx @iqai/adk-cli new --template {TEMPLATE_NAME} my-{template}
cd my-{template}
` ` `
```

#### D. Step 2: Install Dependencies (identical)

```markdown
### Step 2: Install dependencies

` ` `bash
pnpm install
` ` `
```

#### E. Step 3: Configure Environment (identical)

```markdown
### Step 3: Configure environment variables

` ` `bash
cp .env.example .env
` ` `

Required and optional values are documented in `.env.example`.
```

#### F. Test with ADK-TS CLI (verbatim identical)

```markdown
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
```

#### G. Learn More (identical base links)

```markdown
## 📚 Learn More

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAIcom/adk-ts)
- [ADK-TS Sample Projects](https://github.com/IQAIcom/adk-ts-samples)
- [GitHub Discussions](https://github.com/IQAIcom/adk-ts/discussions)
- [Telegram Community](https://t.me/+Z37x8uf6DLE3ZTQ8)
```

#### H. Contributing (identical pattern, only template folder path differs)

```markdown
## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/{TEMPLATE_NAME}) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations
```

#### I. Footer CTA (identical pattern)

```markdown
---

**🎉 Ready to build?** This template gives you everything you need to start building {TYPE} applications with ADK-TS.
```

### Step 3: Detect Drift

Compare each shared section across all templates. Report:

- Which sections have drifted (differ between templates)
- What the differences are
- Which template has the most up-to-date version (if determinable)

### Step 4: Propose Canonical Version

For each drifted section, propose the canonical version that should be used across all templates. Follow these rules:

- GitHub URL org: always `IQAIcom` (not `IQAICOM`)
- Node.js version: `>=22.0` (not `18+`)
- Docs URL: `https://adk.iqai.com/`
- Use "ADK-TS" not bare "ADK" in prose

### Step 5: Apply Updates

After showing the proposed changes and getting user confirmation:

1. Update each drifted section in all affected templates
2. Preserve template-specific content (unique sections listed below)
3. Verify the result by reading each file after update

## Unique Sections (NEVER sync these)

These sections are unique to each template and should NOT be touched:

- `<div align="center">` header (title, description, keywords differ)
- `# {Template Name}` heading and intro paragraph
- `## 🎯 Features` list
- `## 🏗️ How It Works` ASCII diagram
- `## 📁 Template Structure` tree
- Template-specific prerequisites (e.g., "Telegram bot token")
- Template-specific quick start steps (e.g., Step 5 for production build)

## Output

Provide a summary of:

1. Total sections checked
2. Sections that were in sync (no changes needed)
3. Sections that were updated (with before/after diff)
4. Any template-specific anomalies found

## Output File

After completing the sync, write the full summary report to `starter-sync-report.md` in the repository root. This file should contain the complete sync results, so it can be reviewed and shared.
