---
layout: default
title: Quick Start
parent: Guides
nav_order: 1
---

# Quick Start Guide
{: .no_toc }

Get up and running with ADK TypeScript in minutes.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

- Node.js 18+ 
- TypeScript 4.9+
- Basic familiarity with TypeScript and async/await

## Installation

Install ADK in your project:

```bash
npm install @iqai/adk
```

## Your First Agent

Create a simple AI agent that can answer questions:

```typescript
import { AgentBuilder, Models } from '@iqai/adk';

async function main() {
  // Create an agent with OpenAI's GPT-4
  const agent = new AgentBuilder()
    .withModel(Models.openai('gpt-4', {
      apiKey: process.env.OPENAI_API_KEY
    }))
    .withSystemMessage('You are a helpful assistant specializing in TypeScript.')
    .build();

  // Ask the agent a question
  const response = await agent.run('How do I define an interface in TypeScript?');
  
  console.log('Agent:', response.content);
}

main().catch(console.error);
```

## Environment Setup

Create a `.env` file in your project root:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Or use other supported providers:

```bash
# For Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# For Google Gemini  
GOOGLE_API_KEY=your_google_api_key_here
```

## Adding Tools

Give your agent access to external tools:

```typescript
import { AgentBuilder, Models, Tools } from '@iqai/adk';

const agent = new AgentBuilder()
  .withModel(Models.openai('gpt-4'))
  .withSystemMessage('You are a helpful assistant.')
  .withTools([
    Tools.webSearch(), // Built-in web search tool
    Tools.calculator() // Built-in calculator tool
  ])
  .build();

const response = await agent.run('What is the current weather in San Francisco?');
```

## Memory and Context

Add memory to maintain context across conversations:

```typescript
import { AgentBuilder, Models, Memory } from '@iqai/adk';

const agent = new AgentBuilder()
  .withModel(Models.openai('gpt-4'))
  .withMemory(Memory.conversational({
    maxMessages: 10
  }))
  .build();

// The agent will remember this conversation
await agent.run('My name is Alice.');
const response = await agent.run('What is my name?');
// Response: "Your name is Alice."
```

## Next Steps

- [Build more complex agents]({{ '/guides/agents/' | relative_url }})
- [Explore different models]({{ '/guides/models/' | relative_url }})
- [Create custom tools]({{ '/guides/tools/' | relative_url }})
- [Set up persistent memory]({{ '/guides/memory/' | relative_url }})

---

{: .highlight }
Ready to dive deeper? Check out the [API Reference]({{ '/api/' | relative_url }}) for complete documentation of all classes and methods.