---
name: adk-docs-writer
description: "ADK-TS documentation specialist for Fumadocs MDX pages. Use when creating or editing documentation pages in apps/docs/content/docs/, adding new doc sections, discussing docs structure, or updating navigation. Knows Fumadocs components, page archetypes, and navigation registration."
---

# ADK-TS Docs Writer

## Overview

This skill creates and updates documentation pages for the ADK-TS docs site built with Next.js + Fumadocs. It knows the exact component library, frontmatter format, navigation system, and page archetypes used in `apps/docs/content/docs/`.

## When to Use

- Creating a new documentation page
- Editing existing doc content
- Adding a new section to the docs navigation
- Writing MCP server documentation
- Creating guide/tutorial pages

## Before Writing

1. Read the target section's `meta.json` to understand existing navigation
2. Identify which page archetype applies (see below)
3. Read a canonical reference page for that archetype
4. Apply `adk-style-guide` rules (brand, terminology, URLs)

---

## Docs Site Structure

All documentation lives in `apps/docs/content/docs/` with this layout:

```text
apps/docs/content/docs/
├── agent.md                    # Root overview
├── meta.json                   # Root navigation
├── cli/                        # CLI reference
├── mcp-servers/                # MCP server documentation
│   ├── iq-ai-servers/          # Built-in MCP servers
│   ├── third-party-wrappers/   # Third-party wrapper servers
│   ├── external-mcps.mdx
│   └── creating-custom-mcps.mdx
└── framework/                  # Core framework docs
    ├── get-started/            # Installation, quickstart
    ├── agents/                 # Agent types, builder, multi-agent
    ├── tools/                  # Tool types, MCP, OpenAPI, auth
    ├── runtime/                # Event loop, runner, lifecycle
    ├── session-state-memory/   # Sessions, state, memory
    ├── artifacts/              # File/data storage
    ├── callbacks/              # Lifecycle hooks
    ├── context/                # Context types
    ├── evaluation/             # Testing, metrics
    ├── events/                 # Event system
    ├── observability/          # Tracing, metrics
    ├── plugins/                # Plugin system
    └── guides/                 # Deployment, integrations
```

---

## Frontmatter Format

Every page requires this frontmatter:

```yaml
---
title: Page Title
description: Brief SEO-friendly description of the page content
---
```

- `title` is required — displayed in sidebar and page header. Keep it clear and keyword-rich, but concise since it shows in the sidebar (e.g., "MCP Tools" not "Overview of MCP Tool Integration")
- `description` is required and **must be SEO-friendly** — this appears in search engine results and social previews. Write a unique 1-2 sentence description with target keywords. Include "ADK-TS" where natural. Example: `description: Connect your ADK-TS agent to any MCP server — built-in, external, or custom.`
- Do NOT put `icon` in page frontmatter — icons go in `meta.json` only

---

## Navigation Registration

When creating a new page, you MUST register it in the parent directory's `meta.json`:

```json
{
  "title": "Section Title",
  "icon": "IconName",
  "pages": ["existing-page", "new-page-slug"]
}
```

- The page slug is the filename without extension (e.g., `my-page.mdx` → `"my-page"`)
- Order in the `pages` array determines sidebar order
- Available icons: `Building`, `Bot`, `Wrench`, `Play`, `Database`, `FileBox`, `PhoneCall`, `Layers`, `FlaskConical`, `CalendarClock`, `Eye`, `Puzzle`, `BookOpen`, `Terminal`

For new sections (directories), create a `meta.json` with `root: true` if it's a top-level section.

---

## Fumadocs Components Reference

Import only the components you actually use on the page.

### Callout

```tsx
import { Callout } from "fumadocs-ui/components/callout";

<Callout type="info" title="Optional Title">
  Content goes here. Supports **markdown**.
</Callout>;
```

Types: `info` (default), `warn`, `error`, `success`

### Cards & Card

```tsx
import { Cards, Card } from "fumadocs-ui/components/card";

<Cards>
  <Card
    title="🤖 Card Title"
    description="Brief description"
    href="/docs/framework/..."
  />
</Cards>;
```

Used for: Related Topics sections, index/overview pages, navigation grids.

**Emoji convention:** Prefix Card titles with an emoji for visual hierarchy (e.g., "🤖 Agents", "🛠️ Tools", "🧠 Models", "💾 Session"). Exception: MCP server index pages listing many servers use plain titles (e.g., "MCP ABI", "MCP Upbit").

### Steps & Step

Two patterns are supported:

**Pattern A: Steps with markdown headings** (simpler, used in quickstarts)

```tsx
import { Steps } from "fumadocs-ui/components/steps";

<Steps>
  ### 1. First Step
  Content for step 1.

  ### 2. Second Step
  Content for step 2.
</Steps>;
```

**Pattern B: Steps with `<Step>` wrapper** (explicit grouping, used in multi-section guides)

```tsx
import { Steps, Step } from "fumadocs-ui/components/steps";

<Steps>
  <Step>### Generate the Project Content for step 1.</Step>

  <Step>### Install Dependencies Content for step 2.</Step>
</Steps>;
```

Used for: Tutorials, quickstarts, setup guides. Use Pattern A for simple linear guides, Pattern B when steps need tighter grouping or when nesting content within steps.

### Tabs & Tab

````tsx
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

<Tabs items={["pnpm", "npm", "yarn"]}>
  <Tab value="pnpm">```bash pnpm add @iqai/adk ```</Tab>
  <Tab value="npm">```bash npm install @iqai/adk ```</Tab>
</Tabs>;
````

Used for: Package manager alternatives, code variants (Simple/Verbose/Claude Desktop).

### Mermaid

```tsx
import { Mermaid } from "@/components/mdx/mermaid";

<Mermaid
  chart={`
graph TD
    A[User] --> B[Agent]
    B --> C[Tool]
`}
/>;
```

Used for: Architecture diagrams, flow charts.

### McpToolsList

```tsx
import { McpToolsList } from "@/components/mcp/mcp-tools-list";

<McpToolsList serverId="upbit" />;
```

Used for: MCP server pages to display available tools. The `serverId` maps to entries in `apps/docs/data/mcp-tools.json`.

---

## Page Archetypes

### 1. Framework Concept Page

**Used for:** Core framework documentation (agents, tools, runtime, etc.)

**Reference:** `apps/docs/content/docs/framework/tools/mcp-tools.mdx`

**Pattern:**

```mdx
---
title: Feature Name
description: Build and configure feature-name in ADK-TS — setup, usage patterns, and advanced options for TypeScript AI agents.
---

import { Cards, Card } from "fumadocs-ui/components/card";
import { Callout } from "fumadocs-ui/components/callout";

{Opening paragraph explaining what this feature is and why it matters.}

<Callout type="info" title="Key Concept">
  Important context or prerequisite knowledge.
</Callout>

## Section 1

Explanation with code examples:

` ` `typescript
import { Feature } from "@iqai/adk";
// example code
` ` `

## Section 2

More detailed content...

## Configuration

| Property | Type     | Required | Description |
| -------- | -------- | -------- | ----------- |
| `name`   | `string` | Yes      | Description |

## Related Topics

<Cards>
  <Card
    title="🔧 Related Feature"
    description="..."
    href="/docs/framework/..."
  />
  <Card title="📖 Another Topic" description="..." href="/docs/framework/..." />
</Cards>
```

### 2. MCP Server Page

**Used for:** Individual MCP server documentation in `apps/docs/content/docs/mcp-servers/`

MCP server pages go in the correct subdirectory:

- `iq-ai-servers/` — IQ AI built-in servers (`@iqai/mcp-*` packages)
- `third-party-wrappers/` — wrapped external MCP servers

**Reference:** `apps/docs/content/docs/mcp-servers/iq-ai-servers/upbit.mdx`

**Pattern:**

```mdx
---
title: MCP {ServerName}
description: Connect your ADK-TS agent to {ServerName} — installation, configuration, available tools, and integration examples.
---

import { Callout } from "fumadocs-ui/components/callout";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

- **Package**: [`@iqai/mcp-{name}`](https://www.npmjs.com/package/@iqai/mcp-{name})
- **Provider**: [{ProviderName}]({provider_url})

## Overview

{2-3 sentence description of what the MCP server does and key capabilities.}

<Callout type="info" title="{Relevant context}">
  {Important note about the server's behavior or requirements.}
</Callout>

## Getting Started

Install the package:

` ` `bash
pnpm add @iqai/mcp-{name}
` ` `

Use the server in your agent:

<Tabs items={["Simple", "Verbose", "Claude Desktop"]}>
  <Tab value="Simple">
    ` ` `typescript
    import { Mcp{Name} } from "@iqai/adk";

    const toolset = Mcp{Name}();
    const tools = await toolset.getTools();
    ` ` `

  </Tab>

  <Tab value="Verbose">
    ` ` `typescript
    import { McpToolset } from "@iqai/adk";

    const toolset = new McpToolset({
      name: "{Name} MCP Client",
      transport: {
        mode: "stdio",
        command: "npx",
        args: ["-y", "@iqai/mcp-{name}"],
        env: { ... },
      },
    });
    ` ` `

  </Tab>

  <Tab value="Claude Desktop">
    ` ` `json
    {
      "mcpServers": {
        "{name}": {
          "command": "npx",
          "args": ["-y", "@iqai/mcp-{name}"],
          "env": { ... }
        }
      }
    }
    ` ` `
  </Tab>
</Tabs>

## Environment Variables

| Variable     | Required | Description |
| ------------ | -------- | ----------- |
| `{VAR_NAME}` | Yes/No   | Description |

## Available Tools

<McpToolsList serverId="{name}" />

## Integration Example

` ` `typescript
import { Mcp{Name}, LlmAgent } from "@iqai/adk";

const toolset = Mcp{Name}({ env: { ... } });
const tools = await toolset.getTools();

const agent = new LlmAgent({
name: "{name}\_agent",
model: "gemini-2.5-flash",
tools,
});

await toolset.close();
` ` `

## Further Resources

- [{Provider} Documentation]({provider_docs_url})
- [MCP Tools Framework Documentation](/docs/framework/tools/mcp-tools)
```

### 3. Guide Page

**Used for:** Step-by-step tutorials and how-to guides

**Reference:** `apps/docs/content/docs/framework/get-started/quickstart.mdx`

**Pattern:**

```mdx
---
title: Guide Title
description: Step-by-step guide to building {thing} with ADK-TS — from setup to production-ready TypeScript AI agents.
---

import { Steps } from "fumadocs-ui/components/steps";
import { Tabs, Tab } from "fumadocs-ui/components/tabs";
import { Callout } from "fumadocs-ui/components/callout";
import { Cards, Card } from "fumadocs-ui/components/card";

{Opening paragraph — what the reader will build/learn.}

<Callout title="Prerequisites">
  {What the reader needs before starting.}
</Callout>

## Build {The Thing}

<Steps>

### 1. Step Title

{Instructions with code blocks.}

### 2. Step Title

{More instructions.}

<Callout type="warn" title="Important">
  {Warning about a common pitfall.}
</Callout>

### 3. Step Title

{Final instructions.}

</Steps>

## Next Steps

<Cards>
  <Card title="🚀 Related Guide" description="..." href="/docs/..." />
</Cards>
```

### 4. Index / Overview Page

**Used for:** Section landing pages that link to child pages

**Reference:** `apps/docs/content/docs/mcp-servers/iq-ai-servers/index.mdx`

**Pattern:**

```mdx
---
title: Section Title
description: Explore ADK-TS {section topic} — overview of available features, components, and integration options for TypeScript AI agents.
---

import { Cards, Card } from "fumadocs-ui/components/card";
import { Callout } from "fumadocs-ui/components/callout";

{1-2 paragraph overview of the section.}

<Callout type="success" title="Key Benefit">
  {Why this section matters.}
</Callout>

## Category 1

{Brief description.}

<Cards>
  <Card title="🔧 Page Title" description="..." href="/docs/..." />
  <Card title="📦 Page Title" description="..." href="/docs/..." />
</Cards>

## Category 2

{Brief description.}

<Cards>
  <Card title="🚀 Page Title" description="..." href="/docs/..." />
</Cards>
```

---

## Content Conventions

### Code Examples

- Always TypeScript — never JavaScript
- Import from `@iqai/adk` — never relative paths
- Use `AgentBuilder` for introductory examples, `LlmAgent` for advanced
- Default model in examples: `gemini-2.5-flash` (Gemini is the default LLM). Other supported models: `gpt-4.1`, `claude-sonnet-4-5`
- Always close MCP toolsets with `await toolset.close()`

### Progressive Disclosure

Structure pages from simple to complex:

1. Opening paragraph (what and why)
2. Quick example or callout
3. Detailed sections
4. Configuration tables
5. Advanced usage
6. Related Topics cards

### Card Title Emojis

Prefix `<Card>` titles with a relevant emoji for visual hierarchy (e.g., "🤖 Agents", "🛠️ Tools", "🧠 Models", "💾 Session"). Choose emojis that relate to the topic. **Exception:** MCP server index pages listing many servers use plain titles without emojis (e.g., "MCP ABI", "MCP Upbit").

### Best Practices, Troubleshooting & Error Handling

**Do NOT duplicate cross-cutting content.** Best practices, troubleshooting tips, and common errors belong in centralized pages — not scattered across individual concept pages.

Some doc sections have their own dedicated best practices or troubleshooting pages. When writing content for a section, check if one exists in the section's `meta.json` first. Current section-specific pages:

- **Framework-wide best practices** → `framework/guides/best-practices.mdx`
- **Framework-wide troubleshooting** → `framework/guides/troubleshooting.mdx`
- **Agents best practices** → `framework/agents/best-practices.mdx`
- **Artifacts best practices** → `framework/artifacts/best-practices.mdx`
- **Artifacts troubleshooting** → `framework/artifacts/troubleshooting.mdx`
- **MCP best practices** → `mcp-servers/best-practices.mdx`

New sections should only get their own dedicated page when there's enough section-specific content to justify it. Otherwise, add to the framework-wide guides.

On individual concept pages, keep only content specific to that feature. If you find yourself writing a generic tip (e.g., "always close resources", "handle rate limits"), add it to the appropriate centralized page and link to it from the concept page instead. This prevents the duplication problem where the same advice appears on 5+ pages and drifts out of sync.

**Pattern for linking out:**

```mdx
<Callout type="info" title="Best Practices">
  See the [best practices guide](/docs/framework/guides/best-practices) for
  production recommendations.
</Callout>
```

### What Goes in `/docs/framework/guides/`

The `guides/` section contains practical, task-oriented content that spans multiple framework concepts. Use these rules to decide where content belongs:

**Belongs in `guides/`:**

- Deployment guides (Docker, AWS, Railway, Vercel, platform-specific) → `guides/deployment/`
- Integration guides (third-party SDK integrations) → `guides/integrations/`
- Best practices that apply across multiple features → `guides/best-practices.mdx`
- Troubleshooting common errors and debugging tips → `guides/troubleshooting.mdx`
- Agent instruction patterns and prompt engineering → `guides/agent-instructions.mdx`
- Any how-to that combines 2+ framework concepts (e.g., "Build a multi-agent system with memory")

**Does NOT belong in `guides/`:**

- Feature-specific reference docs → go in the feature's own section (e.g., `agents/`, `tools/`, `runtime/`)
- API reference or configuration tables → go on the concept page
- Single-feature tutorials → can go in the feature section as a subsection

**Writing guide pages:**

- Use the **Guide Page archetype** (Steps component for walkthroughs)
- Start with prerequisites and what the reader will accomplish
- Be concrete — show real code, not abstract patterns
- End with Next Steps cards linking to related guides or concept pages

### Related Topics Footer

End most pages with a Related Topics `<Cards>` section linking to 2-4 related pages. This helps readers navigate between related concepts.

---

## SEO Strategy

### Page-Level SEO

Every doc page contributes to ADK-TS discoverability. Follow these rules:

- **`title` frontmatter**: Use clear, keyword-rich titles. Include "ADK-TS" where natural. Example: "MCP Tools" not "Tools Overview".
- **`description` frontmatter**: Write a unique 1-2 sentence description with target keywords. This appears in search results. Example: "Connect your ADK-TS agent to any MCP server — built-in, external, or custom."
- **First paragraph**: Repeat the core keyword naturally. Search engines weight early content heavily.
- **Headings**: Use descriptive H2/H3 headings that match what developers search for. "Quick Start" is better than "Getting Started"; "Environment Variables" is better than "Configuration".

### Target Keywords

Use these terms naturally throughout docs (from `adk-style-guide`):

- "TypeScript AI agents"
- "TypeScript agent framework"
- "build AI agents in TypeScript"
- "AI agent orchestration in TypeScript"
- "ADK-TS" (always, never bare "ADK")

### Internal Linking

- Link between related pages to build topical clusters
- Use descriptive anchor text — "[create custom MCP servers](/docs/mcp-servers/creating-custom-mcps)" not "[click here](/docs/mcp-servers/creating-custom-mcps)"
- End pages with Related Topics `<Cards>` to create link clusters
- Every new page should be linked FROM at least one existing page

---

## Redirects (When Moving or Removing Pages)

When a page URL changes (renamed, moved to a new section, or removed), add a redirect in `apps/docs/next.config.mjs` so old links don't break.

### When to Add Redirects

- **Page moved to new path** → redirect old path to new path (permanent)
- **Page renamed** → redirect old slug to new slug (permanent)
- **Section restructured** → use pattern-based redirect for the whole section
- **Page removed** → only add a redirect if the page was linked externally or had significant traffic. Redirect to the closest relevant page, or the parent section index.

### How to Add Redirects

Redirects are in `apps/docs/next.config.mjs` in the `redirects()` function. The config uses pattern-based arrays to keep it compact:

```typescript
// For a single page move:
{ from: "/docs/old-path", to: "/docs/new-path" }

// For a whole section move (add to the pattern arrays):
// frameworkSections array, mcpServerRedirects array, etc.
```

### When NOT to Add Redirects

- **New pages** — no old URL exists, nothing to redirect
- **Typo fixes in slugs** — only redirect if the page has been live long enough to be indexed
- **Internal-only pages** — if only linked from within the docs site, just update the links instead

### 404 Handling

The site has a custom 404 page (`apps/docs/app/not-found.tsx`) that shows popular sections. Do NOT redirect all 404s to home — the custom 404 page provides better UX by helping users find what they're looking for. Only add specific redirects for moved/renamed pages.

---

## Checklist for New Pages

- [ ] Frontmatter has `title` and `description`
- [ ] Page registered in parent `meta.json` `pages` array
- [ ] Only imports components actually used
- [ ] Code examples use TypeScript with `@iqai/adk` imports
- [ ] Follows the correct page archetype pattern
- [ ] Ends with Related Topics cards (for concept/guide pages)
- [ ] Uses current model names
- [ ] Links use correct internal paths (`/docs/framework/...`)
- [ ] Brand rules followed (ADK-TS terminology from `adk-style-guide`)
