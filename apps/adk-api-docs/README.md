<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK API Documentation</h1>
  <b>Complete documentation for ADK TypeScript, built using TypeDoc with comprehensive API references and guides</b>
  <br/>
  <i>Auto-generated • Type-safe • Developer-friendly</i>
  
  <p align="center">
    <a href="https://www.npmjs.com/package/@iqai/adk">
      <img src="https://img.shields.io/npm/v/@iqai/adk" alt="NPM Version" />
    </a>
    <a href="https://adk.iqai.com/docs">
      <img src="https://img.shields.io/badge/docs-live-blue" alt="Documentation" />
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

## 📖 About

This directory contains the complete documentation for ADK TypeScript, built using TypeDoc for automatic API reference generation. The documentation provides comprehensive coverage of all ADK features, including API references, guides, and examples.

## 📁 Structure

```
adk-api-docs/
├── package.json         # Project configuration and scripts
├── typedoc.json        # TypeDoc configuration
├── README.md           # This file
├── node_modules/       # Dependencies
└── api/                # Auto-generated TypeDoc output (created on build)
```

## 🚀 Development

### Prerequisites

Before building the documentation, ensure you have:

- [Node.js](https://nodejs.org) (version 18 or later)
- [pnpm](https://pnpm.io) (recommended package manager)
- Basic familiarity with [TypeDoc](https://typedoc.org/) and documentation generation

### Setup

1. **Install dependencies** from the workspace root:

   ```bash
   pnpm install
   ```

2. **Navigate to the API docs directory**:

   ```bash
   cd apps/adk-api-docs
   ```

### Building Documentation

1. **Generate API documentation**:

   ```bash
   pnpm run docs:build
   ```

2. **Clean previous builds**:

   ```bash
   pnpm run docs:clean
   ```

3. **Build and serve documentation**:

   ```bash
   pnpm run dev
   ```

4. **Just serve existing documentation**:

   ```bash
   pnpm run docs:serve
   ```

The generated documentation will be available in the `api/` directory and served at `http://localhost:4000`.

## 🛠️ Configuration

### TypeDoc Configuration

The main configuration is in `typedoc.json`:

```json
{
  "entryPoints": ["../../packages/adk/src/index.ts"],
  "out": "./api",
  "theme": "default",
  "name": "@iqai/adk API Documentation",
  "readme": "../../packages/adk/README.md",
  "excludePrivate": true,
  "excludeExternals": true,
  "githubPages": true,
  "excludeReferences": true
}
```

Key settings:

- **`entryPoints`**: Main TypeScript files to document
- **`out`**: Output directory (`./api`)
- **`name`**: Documentation site title
- **`readme`**: Uses ADK package README as main page
- **`excludePrivate/excludeExternals`**: Controls visibility of APIs
- **`githubPages`**: Optimized for GitHub Pages deployment
- **`excludeReferences`**: Hides "Re-exports" to reduce clutter from barrel exports

### Package Configuration

The `package.json` contains scripts for building and serving documentation:

- `pnpm run docs:build` - Generate TypeDoc documentation
- `pnpm run docs:serve` - Serve documentation on port 4000
- `pnpm run docs:clean` - Remove existing documentation
- `pnpm run dev` - Build and serve in one command

## 🚀 Deployment

Documentation is automatically built and deployed to GitHub Pages via GitHub Actions when changes are pushed to the main or develop branches.

The deployment workflow (`.github/workflows/docs.yml`):

1. Triggers on changes to ADK source code or documentation files
2. Installs Node.js 20 and pnpm dependencies
3. Builds the `@iqai/adk` package
4. Generates TypeDoc documentation in `apps/adk-api-docs/api`
5. Deploys to GitHub Pages (main branch only)

The documentation is automatically published at the configured GitHub Pages URL.

## 🎨 Customization

### Adding New Content

API documentation is automatically generated from TypeScript source code comments. To add or improve documentation:

1. **Add JSDoc comments** to TypeScript source files in `packages/adk/src/`
2. **Use TypeDoc tags** for enhanced documentation:

   ````typescript
   /**
    * Creates a new agent with the specified configuration.
    *
    * @param config - The agent configuration
    * @returns A configured agent instance
    * @example
    * ```typescript
    * const agent = createAgent({ name: 'MyAgent' });
    * ```
    */
   export function createAgent(config: AgentConfig): Agent {
     // implementation
   }
   ````

3. **Rebuild documentation** to see changes

### Styling and Theme

TypeDoc provides several built-in themes and supports custom styling:

- Default theme with responsive design
- Custom CSS can be added via TypeDoc configuration
- Plugin ecosystem for enhanced features

## 📚 Resources

- [TypeDoc Documentation](https://typedoc.org/) - Complete TypeDoc reference
- [ADK Live Documentation](https://adk.iqai.com/docs) - Published documentation site
- [TSDoc Reference](https://tsdoc.org/) - Documentation comment standards
