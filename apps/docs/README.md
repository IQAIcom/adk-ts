<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="80" />

<br/>

# ADK Documentation

**Official documentation site for the Agent Development Kit (ADK) TypeScript framework**

*Comprehensive guides • API reference • Examples • Best practices*

---

</div>

## 📖 About

This is the official documentation website for ADK TS, built with [Next.js](https://nextjs.org) and [Fumadocs](https://fumadocs.dev). It provides comprehensive documentation, tutorials, and examples for building sophisticated AI agents with the ADK framework.

## 🚀 Quick Start

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the documentation locally.

### Build

Build the documentation for production:

```bash
pnpm build
```

### Start Production Server

```bash
pnpm start
```

## 📁 Project Structure

```
apps/docs/
├── app/
│   ├── (home)/          # Landing page and home routes
│   ├── docs/            # Documentation pages
│   ├── api/search/      # Search API endpoint
│   └── layout.tsx       # Root layout
├── content/docs/        # MDX documentation content
├── lib/
│   ├── source.ts        # Content source adapter
│   └── getLlmText.ts    # LLM text processing
├── public/              # Static assets
└── source.config.ts     # Fumadocs configuration
```

## 📝 Content Management

Documentation content is written in MDX format and stored in the `content/docs/` directory. The content is organized into sections:

- **Getting Started** - Installation, quick start, and basic concepts
- **Agents** - Agent creation, configuration, and management
- **Tools** - Built-in tools and custom tool development
- **Memory** - Memory systems and session management
- **Flows** - Conversation flows and multi-agent orchestration
- **Artifacts** - File handling and artifact management
- **API Reference** - Complete API documentation

## 🔧 Configuration

### Content Source

The `lib/source.ts` file configures the content source adapter using Fumadocs' [`loader()`](https://fumadocs.dev/docs/headless/source-api) API to process MDX files.

### Layout Configuration

Shared layout options are defined in `app/layout.config.tsx`, including navigation, theme settings, and site metadata.

### MDX Configuration

The `source.config.ts` file customizes MDX processing, including frontmatter schema and content transformations.

## 🔍 Search

The documentation includes full-text search powered by Fumadocs' search system. The search API is implemented in `app/api/search/route.ts`.

## 🎨 Styling

The documentation uses:
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Fumadocs UI](https://fumadocs.dev) components for documentation layout
- [Lucide React](https://lucide.dev) for icons

## 🚀 Deployment

The documentation is automatically deployed when changes are pushed to the main branch. The build process:

1. Processes MDX content with Fumadocs
2. Builds the Next.js application
3. Generates static assets for optimal performance

## 🤝 Contributing

To contribute to the documentation:

1. Edit MDX files in `content/docs/`
2. Test changes locally with `pnpm dev`
3. Submit a pull request

For more details, see the main project's [Contributing Guide](../../CONTRIBUTION.md).

## 📚 Resources

- [ADK Framework](https://github.com/IQAIcom/adk-ts) - Main repository
- [Fumadocs](https://fumadocs.dev) - Documentation framework
- [Next.js](https://nextjs.org) - React framework
- [MDX](https://mdxjs.com) - Markdown with JSX

---

**Visit the live documentation:** [https://adk.iqai.com](https://adk.iqai.com)
