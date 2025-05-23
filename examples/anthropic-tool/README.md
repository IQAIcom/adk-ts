# Tool Calling Example with Google Gemini

This example demonstrates how to use Google's Gemini Flash model with tool calling capabilities. Originally built for Anthropic Claude, this example has been updated to work with Gemini.

## Features

- Tool calling with Google Gemini models
- Weather tool implementation
- Basic query example
- Multi-turn conversation example
- Error handling

## Prerequisites

- Node.js 16+
- A Google API key

## Setup

1. Make sure you have a Google API key. If you don't have one, you can get it from the [Google AI Studio](https://makersuite.google.com/)

2. Set up your environment variables:
   - Create a `.env` file in the root directory or set the environment variable directly
   - Add your Google API key: `GOOGLE_API_KEY=your_key_here`

## Running the Example

```bash
# From the project root
npm run build
npm run example:anthropic  # Note: The script name remains the same for compatibility
```

## How It Works

This example showcases tool calling with Google Gemini models:

1. Uses Gemini 2.0 Flash which supports tool calling
2. Registers a weather tool with the Agent framework
3. Demonstrates both single-turn and multi-turn tool usage
4. Shows structured responses from the tool

The example uses the latest Google GenAI SDK which provides proper TypeScript type definitions and support for Gemini features, including:

- Tool calling
- Multimodal inputs
- Streaming responses
- Function calling

## Models

This example works with the following Gemini model:
- gemini-2.0-flash