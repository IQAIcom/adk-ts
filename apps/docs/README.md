<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />

<br/>

# ADK-TS Documentation Site

**Contributing guide for the official ADK-TS documentation**

*Setup • Development • Contributing • Best practices*

---

</div>

## 📖 About

This README is specifically for contributors to the ADK-TS documentation. The documentation site is built with [Next.js](https://nextjs.org) and [Fumadocs](https://fumadocs.dev), providing comprehensive guides, API references, tutorials, and examples for building sophisticated AI agents with the ADK framework.

If you're looking to **use** the ADK framework, visit the [live documentation](https://adk.iqai.com). This guide is for those who want to **contribute** to improving the documentation.

## 🚀 Getting Started

### Prerequisites

Before contributing to the documentation, ensure you have:

- [Node.js](https://nodejs.org) (version 18 or later)
- [pnpm](https://pnpm.io) (recommended package manager)
- Basic familiarity with [Markdown](https://www.markdownguide.org/) and [MDX](https://mdxjs.com/)

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

3. **Navigate to the docs directory**:

   ```bash
   cd apps/docs
   ```

4. **Start the development server**:

   ```bash
   pnpm dev
   ```

5. **View the documentation** at [http://localhost:3000](http://localhost:3000)

The development server supports hot reloading, so changes to documentation files will be reflected immediately in your browser.

### Building for Production

Test your changes by building the documentation:

```bash
pnpm build
```

To run the production build locally:

```bash
pnpm start
```

## ⚙️ Architecture Overview

The documentation site uses:

- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[Fumadocs](https://fumadocs.dev)** - Documentation-focused React components and utilities
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[Lucide React](https://lucide.dev)** - Icon library
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme switching
- **[PostHog](https://posthog.com)** - Analytics (production only)

## 🤝 How to Contribute

### Content Structure

All documentation content is written in [MDX format](https://mdxjs.com/) and organized in the `content/docs/` directory:

- **`framework/`** - Core ADK framework documentation
- **`cli/`** - ADK CLI documentation
- **`mcp-servers/`** - Model Context Protocol server documentation

### Types of Documentation Contributions

We welcome various types of contributions to improve the documentation:

- **Fix typos and grammar** - Help improve readability
- **Add missing examples** - Provide code samples for complex concepts
- **Improve explanations** - Make difficult topics easier to understand
- **Add new sections** - Cover missing topics or use cases
- **Update outdated content** - Keep documentation current with latest features
- **Improve navigation** - Enhance the organization and discoverability

### Writing Guidelines

1. **Use clear, concise language** - Write for developers of all skill levels
2. **Include code examples** - Provide working code snippets whenever possible
3. **Follow MDX syntax** - Use proper frontmatter and MDX components
4. **Add metadata** - Include proper title, description, and navigation order in frontmatter
5. **Use headings appropriately** - Structure content with H1, H2, H3, etc.
6. **Call out important information** - Use callouts for tips, warnings, and important notes

### Contribution Workflow

1. **Fork the repository** on GitHub
2. **Create a feature branch** from main:

   ```bash
   git checkout -b docs/improve-agent-examples
   ```

3. **Make your changes** following the writing guidelines above
4. **Test locally** with `pnpm dev` to ensure everything works
5. **Commit your changes** with descriptive commit messages:

   ```bash
   git commit -m "docs: add examples for custom tool creation"
   ```

6. **Push to your fork** and **create a Pull Request**

### Getting Help

- **[Check existing issues](https://github.com/IQAIcom/adk-ts/issues)** for similar questions or problems
- **[Ask in discussions](https://github.com/IQAIcom/adk-ts/discussions)** for clarification on documentation topics

For more detailed contribution guidelines, see the main project's [Contributing Guide](../../CONTRIBUTION.md).

## 📚 Resources for Contributors

### Documentation Tools & Frameworks

- **[Fumadocs](https://fumadocs.dev)** - Documentation framework powering this site
- **[MDX](https://mdxjs.com)** - Markdown with JSX components
- **[Next.js](https://nextjs.org)** - React framework for the documentation site

### ADK Framework Resources

- **[ADK-TS Repository](https://github.com/IQAIcom/adk-ts)** - Main framework repository
- **[Live Documentation](https://adk.iqai.com)** - Published documentation site
- **[Contributing Guide](../../CONTRIBUTION.md)** - General project contribution guidelines
- **[Examples](../../apps/examples/)** - Code examples and tutorials

### Writing & Style Resources

- **[Markdown Guide](https://www.markdownguide.org/)** - Comprehensive Markdown reference
- **[MDX Documentation](https://mdxjs.com/docs/)** - Learn about MDX syntax and components
- **[Fumadocs Components](https://fumadocs.dev/docs/ui/components)** - Available UI components for documentation

---

**Ready to contribute?** Start by exploring the `content/docs/` directory and improving existing pages or adding new content. Your contributions help make ADK-TS more accessible and useful for developers worldwide!
