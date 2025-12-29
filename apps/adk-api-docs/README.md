# ADK Documentation

This directory contains the complete documentation for ADK TypeScript, built using Jekyll with the Just the Docs theme.

## Structure

```
docs/
├── _config.yml          # Jekyll configuration
├── _includes/           # Custom CSS and includes
├── _guides/            # Tutorial and guide content
├── api/                # Auto-generated TypeDoc API docs
├── index.md            # Homepage
├── api.md              # API reference index
├── guides.md           # Guides index
└── Gemfile             # Ruby dependencies
```

## Development

### Prerequisites

- Ruby 3.1+
- Bundler
- Node.js 18+ (for TypeDoc generation)

### Setup

1. Install Ruby dependencies:
   ```bash
   cd docs && bundle install
   ```

2. Install TypeDoc dependencies:
   ```bash
   cd .. && pnpm install
   ```

### Building Documentation

1. Generate API documentation:
   ```bash
   pnpm run docs:build
   ```

2. Serve locally:
   ```bash
   pnpm run docs:serve
   ```

3. Or run both:
   ```bash
   pnpm run docs:dev
   ```

The site will be available at `http://localhost:4000`.

### Adding Content

#### Guides

Create new guide files in `_guides/` directory:

```markdown
---
layout: default
title: Your Guide Title
parent: Guides
nav_order: 4
---

# Your Guide Title

Content goes here...
```

#### API Documentation

API documentation is automatically generated from TypeScript source code using TypeDoc. The configuration is in `../typedoc.json`.

## Deployment

Documentation is automatically built and deployed via GitHub Actions when changes are pushed to the main branch.

The workflow:
1. Installs dependencies
2. Builds the ADK package
3. Generates TypeDoc API documentation
4. Builds Jekyll site
5. Deploys to GitHub Pages

## Configuration

### Jekyll (_config.yml)

Key settings:
- `title`: Site title
- `baseurl`: Base URL for GitHub Pages
- `theme`: just-the-docs
- Navigation and search settings

### TypeDoc (../typedoc.json)

Key settings:
- `entryPoints`: Main TypeScript files to document
- `out`: Output directory for generated docs
- Plugins for markdown and frontmatter generation

## Customization

### Styling

Custom CSS is in `_includes/custom.css` and loaded via the Jekyll configuration.

### Theme Options

Just the Docs theme supports extensive customization:
- Color schemes
- Navigation structure  
- Search configuration
- Callout styles

See the [Just the Docs documentation](https://just-the-docs.github.io/just-the-docs/) for details.