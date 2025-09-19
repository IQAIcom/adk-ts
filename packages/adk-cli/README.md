<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="80" />

<br/>

# @iqai/adk-cli

**Contributing guide for the ADK CLI package**

*Setup • Development • Contributing • Architecture*

<p align="center">
  <a href="https://www.npmjs.com/package/@iqai/adk-cli">
    <img src="https://img.shields.io/npm/v/@iqai/adk-cli" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/@iqai/adk-cli">
    <img src="https://img.shields.io/npm/dm/@iqai/adk-cli" alt="NPM Downloads" />
  </a>
  <a href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md">
    <img src="https://img.shields.io/npm/l/@iqai/adk-cli" alt="License" />
  </a>
  <a href="https://github.com/IQAIcom/adk-ts">
    <img src="https://img.shields.io/github/stars/IQAIcom/adk-ts?style=social" alt="GitHub Stars" />
  </a>
</p>

---

</div>

## 📖 About

This README is specifically for contributors to the ADK CLI package. The CLI provides a complete toolkit for developing, testing, and deploying AI agents with features like project scaffolding, interactive testing interfaces, and intelligent agent discovery.

If you're looking to **use** the ADK CLI, visit the [live documentation](https://adk.iqai.com/docs/cli). This guide is for those who want to **contribute** to improving the CLI itself.

## 🚀 Getting Started

### Prerequisites

Before contributing to the ADK CLI, ensure you have:

- [Node.js](https://nodejs.org) (version 22 or later)
- [pnpm](https://pnpm.io) (recommended package manager)
- Basic familiarity with [NestJS](https://nestjs.com/), [TypeScript](https://www.typescriptlang.org/), and CLI development

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

3. **Navigate to the CLI package**:

   ```bash
   cd packages/adk-cli
   ```

4. **Build the CLI**:

   ```bash
   pnpm build
   ```

5. **Link for local development**:

   ```bash
   # Link the CLI globally for testing
   npm link
   
   # Or run directly with pnpm
   pnpm start --help
   ```

### Development Workflow

```bash
# Watch mode for development
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm type-check

# Linting
pnpm lint

# Build for production
pnpm build
```

## ⚙️ Architecture Overview

The ADK CLI is built with:

- **[NestJS](https://nestjs.com)** - Modular framework for building scalable applications
- **[Commander.js](https://github.com/tj/commander.js)** - Command-line interface framework (via NestJS CLI)
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[tsup](https://tsup.egoist.dev/)** - Fast TypeScript bundler
- **[Vitest](https://vitest.dev/)** - Fast unit testing framework

### Project Structure

```
src/
├── app.module.ts          # Main NestJS application module
├── main.ts               # CLI entry point
├── cli/                  # Command implementations
│   ├── cli.module.ts     # CLI commands module
│   ├── new.command.ts    # adk new command
│   ├── run.command.ts    # adk run command
│   ├── serve.command.ts  # adk serve command
│   └── web.command.ts    # adk web command
├── common/               # Shared utilities
│   ├── tokens.ts         # Dependency injection tokens
│   └── types.ts          # Common TypeScript types
└── http/                 # HTTP server implementation
    ├── bootstrap.ts      # Server bootstrap logic
    ├── http.module.ts    # HTTP module configuration
    ├── config/          # Configuration management
    ├── discovery/       # Agent discovery service
    ├── dto/            # Data transfer objects
    ├── events/         # Server-sent events
    ├── health/         # Health check endpoints
    ├── messaging/      # Agent messaging
    ├── providers/      # Core services
    ├── reload/         # Hot reload functionality
    ├── sessions/       # Session management
    └── state/          # State management
```

### Key Components

1. **Commands** (`src/cli/`) - Individual CLI command implementations
2. **HTTP Server** (`src/http/`) - RESTful API server for agent management
3. **Agent Discovery** (`src/http/discovery/`) - Intelligent agent scanning and loading
4. **Providers** (`src/http/providers/`) - Core services for agent management
5. **Session Management** (`src/http/sessions/`) - Conversation state persistence

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions to improve the CLI:

- **Add new commands** - Implement new CLI functionality
- **Improve existing commands** - Enhance current command capabilities
- **Fix bugs** - Resolve issues and improve stability
- **Add tests** - Increase test coverage and reliability
- **Improve documentation** - Update inline docs and comments
- **Optimize performance** - Make the CLI faster and more efficient
- **Add new templates** - Create project scaffolding templates

### Development Guidelines

1. **Follow TypeScript best practices** - Use proper typing and modern ES features
2. **Write comprehensive tests** - Cover new functionality with unit tests
3. **Use NestJS patterns** - Follow dependency injection and module patterns
4. **Handle errors gracefully** - Provide clear error messages and recovery
5. **Support all platforms** - Ensure compatibility across macOS, Linux, and Windows
6. **Follow semantic versioning** - Use appropriate version bumps for changes

### Testing Your Changes

1. **Unit tests**:

   ```bash
   pnpm test
   ```

2. **Manual testing with linking**:

   ```bash
   # Build and link for testing
   pnpm build
   npm link
   
   # Test commands
   adk --help
   adk new test-project
   ```

3. **Integration testing**:

   ```bash
   # Test with actual agent projects
   cd /tmp
   adk new test-agent --template simple-agent
   cd test-agent
   adk run
   ```

### Contribution Workflow

1. **Fork the repository** on GitHub
2. **Create a feature branch** from main:

   ```bash
   git checkout -b cli/add-new-feature
   ```

3. **Make your changes** following the guidelines above
4. **Add or update tests** for your changes
5. **Run the test suite** to ensure nothing breaks:

   ```bash
   pnpm test
   pnpm type-check
   pnpm lint
   ```

6. **Test manually** by linking and running CLI commands
7. **Commit your changes** with descriptive commit messages:

   ```bash
   git commit -m "cli: add support for custom agent templates"
   ```

8. **Push to your fork** and **create a Pull Request**

### Adding New Commands

To add a new CLI command:

1. **Create command file** in `src/cli/`:

   ```typescript
   // src/cli/my-command.ts
   import { Command, CommandRunner } from 'nest-commander';
   
   @Command({
     name: 'my-command',
     description: 'Description of what the command does',
   })
   export class MyCommand extends CommandRunner {
     async run(passedParams: string[]): Promise<void> {
       // Implementation here
     }
   }
   ```

2. **Register in CLI module**:

   ```typescript
   // src/cli/cli.module.ts
   import { MyCommand } from './my-command';
   
   @Module({
     providers: [
       // ... other commands
       MyCommand,
     ],
   })
   export class CliModule {}
   ```

3. **Add tests**:

   ```typescript
   // src/cli/my-command.spec.ts
   describe('MyCommand', () => {
     // Test implementation
   });
   ```

### Working with the HTTP Server

The CLI includes a full HTTP server for agent management. Key areas:

- **Controllers** - Handle HTTP requests (`src/http/*/`)
- **Services** - Business logic implementation
- **DTOs** - Request/response data structures
- **Modules** - NestJS module organization

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test my-command.spec.ts
```

### Test Structure

Tests are organized alongside source files:

- Unit tests: `*.spec.ts`
- Integration tests: `*.integration.spec.ts`
- E2E tests: `*.e2e.spec.ts`

## 📚 Resources for Contributors

### ADK Framework Resources

- **[ADK-TS Repository](https://github.com/IQAIcom/adk-ts)** - Main framework repository
- **[Live Documentation](https://adk.iqai.com)** - Published documentation site
- **[CLI Documentation](https://adk.iqai.com/docs/cli)** - User-facing CLI docs
- **[Contributing Guide](../../CONTRIBUTION.md)** - General project contribution guidelines
- **[Examples](../../apps/examples/)** - Code examples and tutorials

### Technical Resources

- **[NestJS Documentation](https://docs.nestjs.com)** - Framework powering the CLI
- **[Commander.js](https://github.com/tj/commander.js)** - CLI framework patterns
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - TypeScript best practices
- **[Vitest Documentation](https://vitest.dev/)** - Testing framework guide

### Development Tools

- **[tsup Configuration](./tsup.config.ts)** - Build configuration
- **[Vitest Configuration](./vitest.config.ts)** - Test configuration
- **[TypeScript Configuration](./tsconfig.json)** - Type checking setup
- **[HTTP Layer Architecture](./src/http/ARCHITECTURE.md)** - Technical documentation for the HTTP server layer

## 🔧 Debugging

When working on the CLI codebase, use these debugging techniques:

```bash
# Enable detailed logging for development
export ADK_DEBUG_NEST=true
export ADK_VERBOSE=true

# Test your changes with verbose output
adk run --verbose
adk serve --verbose
```

### Common Contributor Issues

1. **Module resolution errors** - Ensure proper imports and module registration in NestJS
2. **Build failures** - Check TypeScript configuration and dependency versions
3. **Test failures** - Verify mock setups and async handling in test files
4. **Runtime errors during development** - Use debug logging and proper error handling

---

**Ready to contribute?** Start by exploring the codebase, running the tests, and trying out the existing commands. Your contributions help make the ADK CLI more powerful and user-friendly for developers worldwide!
