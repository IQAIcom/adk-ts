# ADK Hono Server

A web server template using the [Hono](https://hono.dev/) framework that exposes AI agent functionality via REST API. This template demonstrates how to integrate ADK agents into a web service.

## Features

- 🚀 Fast and lightweight web server using Hono
- 🤖 AI agent integration with ADK
- 📝 RESTful API endpoints
- ⚡ Hot reload development
- 🧹 Code formatting and linting
- 🔧 TypeScript support

## Quick Start

1. **Clone and setup**
   ```bash
   git clone <your-repo>
   cd adk-hono-server
   pnpm install
   ```

2. **Environment setup**
   ```bash
   cp example.env .env
   # Edit .env with your API keys
   ```

3. **Development**
   ```bash
   pnpm dev
   ```

4. **Production build**
   ```bash
   pnpm build
   pnpm start
   ```

## API Endpoints

### GET `/`
Returns server information and available endpoints.

**Response:**
```json
{
  "message": "🤖 ADK Hono Server is running!",
  "endpoints": {
    "ask": "POST /ask - Ask the AI agent a question",
    "health": "GET /health - Health check"
  }
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-21T10:30:00.000Z"
}
```

### POST `/ask`
Ask the AI agent a question.

**Request Body:**
```json
{
  "question": "What is the capital of France?"
}
```

**Response:**
```json
{
  "question": "What is the capital of France?",
  "response": "The capital of France is Paris.",
  "timestamp": "2025-07-21T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "Question is required"
}
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `LLM_MODEL` - AI model to use (default: "gemini-2.5-flash")
- `GOOGLE_API_KEY` - Google AI API key (required for Gemini models)
- `DEBUG` - Enable debug logging (default: "false")

## Example Usage

### Using curl
```bash
# Ask a question
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the capital of France?"}'

# Health check
curl http://localhost:3000/health
```

### Using JavaScript fetch
```javascript
const response = await fetch('http://localhost:3000/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    question: 'What is the capital of France?'
  })
});

const data = await response.json();
console.log(data.response);
```

## Customization

### Adding New Endpoints
```typescript
// In src/index.ts
app.get('/custom', async (c) => {
  // Your custom logic here
  return c.json({ message: 'Custom endpoint' });
});
```

### Using Different AI Models
```typescript
// In src/index.ts, modify the agent creation:
const response = await AgentBuilder
  .withModel("claude-3-sonnet")  // or any other supported model
  .ask(question);
```

### Adding Tools and Context
```typescript
const response = await AgentBuilder
  .withModel(env.LLM_MODEL || "gemini-2.5-flash")
  .withTools([/* your tools */])
  .withContext("Your custom context")
  .ask(question);
```

## Development

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Check code formatting
- `pnpm lint:fix` - Fix code formatting issues

## Deployment

This server can be deployed to any Node.js hosting platform:

- **Vercel**: Zero-config deployment
- **Railway**: Simple deployment with database support
- **Heroku**: Classic PaaS deployment
- **Docker**: Containerized deployment

## Learn More

- [ADK Documentation](https://adk.iqai.com)
- [Hono Documentation](https://hono.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
