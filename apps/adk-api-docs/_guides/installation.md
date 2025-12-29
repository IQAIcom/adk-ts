---
layout: default
title: Installation & Setup
parent: Guides
nav_order: 2
---

# Installation & Setup
{: .no_toc }

Complete guide to installing and setting up ADK TypeScript in your project.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## System Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 4.9.0 or higher  
- **Package Manager**: npm, pnpm, or yarn

## Installation

### Using npm

```bash
npm install @iqai/adk
```

### Using pnpm (recommended)

```bash
pnpm add @iqai/adk
```

### Using yarn

```bash
yarn add @iqai/adk
```

## TypeScript Configuration

Ensure your `tsconfig.json` includes the following settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Environment Variables

ADK supports multiple LLM providers. Set up the API keys for the providers you plan to use:

### OpenAI

```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

### Anthropic (Claude)

```bash
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

### Google (Gemini)

```bash
GOOGLE_API_KEY=your-google-api-key
# or for Vertex AI
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### Azure OpenAI

```bash
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
```

## Environment File Setup

Create a `.env` file in your project root:

```bash
# .env file
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key

# Optional: Telemetry configuration
ADK_TELEMETRY_ENABLED=true
ADK_LOG_LEVEL=info
```

Load environment variables in your application:

```typescript
import dotenv from 'dotenv';
dotenv.config();

// Now you can use process.env.OPENAI_API_KEY, etc.
```

## Verification

Test your installation by creating a simple agent:

```typescript
// test-installation.ts
import { AgentBuilder, Models } from '@iqai/adk';

async function testInstallation() {
  try {
    const agent = new AgentBuilder()
      .withModel(Models.openai('gpt-3.5-turbo'))
      .withSystemMessage('You are a test assistant.')
      .build();
    
    const response = await agent.run('Hello, ADK!');
    console.log('✅ Installation successful!');
    console.log('Response:', response.content);
  } catch (error) {
    console.error('❌ Installation test failed:', error);
  }
}

testInstallation();
```

Run the test:

```bash
npx tsx test-installation.ts
# or
node --loader=tsx test-installation.ts
```

## Common Issues

### Module Resolution Errors

If you encounter module resolution issues, add this to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

### API Key Issues

- Ensure your API keys are valid and have sufficient quota
- Check that environment variables are properly loaded
- Verify the correct API key format for each provider

### TypeScript Compilation Errors

Make sure you're using compatible TypeScript version:

```bash
npm install -D typescript@^5.0.0
```

## Next Steps

Now that ADK is installed and configured:

1. [Build your first agent]({{ '/guides/first-agent/' | relative_url }})
2. [Explore different models]({{ '/guides/models/' | relative_url }})  
3. [Add tools to your agent]({{ '/guides/tools/' | relative_url }})

---

{: .note }
Need help? Check the [troubleshooting section]({{ '/guides/troubleshooting/' | relative_url }}) or create an issue on [GitHub](https://github.com/IQAIcom/adk-ts/issues).