# ADK Telegram Bot

A Telegram bot starter template powered by ADK (AI Development Kit) that enables you to create intelligent, conversational bots for Telegram. This template provides a solid foundation for building AI-powered Telegram bots with persistent conversation memory.

## Features

- 🤖 AI-powered conversations using ADK
- 💬 Telegram integration via MCP (Model Context Protocol)
- 🧠 Persistent conversation memory with SQLite
- 🎯 Customizable bot personality and instructions
- ⚡ Hot reload development
- 🧹 Code formatting and linting
- 🔧 TypeScript support

## Prerequisites

Before you begin, you'll need:

1. **Telegram Bot Token**: Create a bot via [@BotFather](https://t.me/botfather) on Telegram
2. **AI API Key**: Get an API key for your chosen AI model (e.g., Google AI Studio for Gemini)

## Quick Start

1. **Clone and setup**
   ```bash
   git clone <your-repo>
   cd adk-telegram-bot
   pnpm install
   ```

2. **Environment setup**
   ```bash
   cp example.env .env
   # Edit .env with your tokens and API keys
   ```

3. **Configure your bot**
   - Get a bot token from [@BotFather](https://t.me/botfather)
   - Add the token to your `.env` file
   - Customize the bot personality in `src/index.ts`

4. **Development**
   ```bash
   pnpm dev
   ```

5. **Production**
   ```bash
   pnpm build
   pnpm start
   ```

## Environment Variables

Required variables in your `.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# AI Model Configuration  
LLM_MODEL=gemini-2.5-flash
GOOGLE_API_KEY=your_google_api_key_here

# Optional
DEBUG=false
```

## Creating Your Telegram Bot

1. **Start a chat with [@BotFather](https://t.me/botfather)**
2. **Send `/newbot`** and follow the instructions
3. **Choose a name** for your bot (e.g., "My AI Assistant")
4. **Choose a username** for your bot (must end in 'bot', e.g., "myaiassistant_bot")
5. **Copy the token** provided by BotFather
6. **Add the token** to your `.env` file

## Customizing Your Bot

### Bot Personality

Edit the `withInstruction()` section in `src/index.ts` to customize your bot's personality:

```typescript
.withInstruction(`
  You are a [YOUR BOT PERSONALITY HERE]
  
  Personality:
  - [Trait 1]
  - [Trait 2]
  - [Trait 3]
  
  Guidelines:
  - [Guideline 1]
  - [Guideline 2]
`)
```

### Bot Description

Update the `withDescription()` to change what your bot does:

```typescript
.withDescription("You are a [YOUR BOT DESCRIPTION]")
```

### AI Model

Change the AI model by updating the `LLM_MODEL` in your `.env` file:

```env
LLM_MODEL=claude-3-sonnet  # or any other supported model
```

## Bot Capabilities

Your bot can:

- 📝 **Respond to direct messages**
- 💬 **Participate in group chats** (when mentioned)
- 🧠 **Remember conversation context** across messages
- 🎯 **Maintain different contexts** for different users/chats
- 🔄 **Handle multiple conversations** simultaneously

## Database

The bot uses SQLite for persistent storage:

- **Location**: `src/data/telegram_bot.db`
- **Purpose**: Stores conversation history and context
- **Auto-created**: Database and tables are created automatically

## Development

### Commands

- `pnpm dev` - Start development with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production build
- `pnpm lint` - Check code formatting
- `pnpm lint:fix` - Fix formatting issues

### File Structure

```
src/
├── index.ts          # Main bot initialization and configuration
└── data/             # SQLite database storage (auto-created)
    └── telegram_bot.db
```

## Deployment

### Local Development
```bash
pnpm dev
```

### Production Server
```bash
pnpm build
pnpm start
```

### Docker
```bash
docker build -t telegram-bot .
docker run --env-file .env telegram-bot
```

### Cloud Platforms
- **Railway**: Simple deployment with persistent storage
- **Heroku**: Classic PaaS deployment
- **DigitalOcean**: VPS deployment
- **AWS/GCP**: Cloud deployment

## Testing Your Bot

1. **Start the bot** with `pnpm dev`
2. **Find your bot** on Telegram using the username you chose
3. **Send a message** like "Hello!" 
4. **Check the logs** to see the bot processing messages
5. **Verify responses** are working correctly

## Troubleshooting

### Common Issues

**Bot not responding:**
- Check your `TELEGRAM_BOT_TOKEN` is correct
- Ensure the bot is running (`pnpm dev`)
- Check the console for error messages

**AI responses not working:**
- Verify your AI API key (e.g., `GOOGLE_API_KEY`)
- Check if the model name is correct
- Ensure you have API credits/quota

**Database errors:**
- Check write permissions in the `src/data/` directory
- Ensure SQLite is available on your system

### Getting Help

- Check the [ADK Documentation](https://adk.iqai.com)
- Review the console logs for detailed error messages
- Ensure all environment variables are set correctly

## Examples

### Basic Conversation
```
User: Hello!
Bot: Hello! 👋 How can I help you today?

User: What's the weather like?
Bot: I don't have access to real-time weather data, but I'd be happy to help you find a weather service or discuss weather-related topics! 🌤️
```

### Group Chat
When mentioned in a group:
```
User: @yourbot What do you think about this?
Bot: I'd be happy to share my thoughts! Could you tell me more about what specifically you'd like my opinion on? 🤔
```

## Learn More

- [ADK Documentation](https://adk.iqai.com)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BotFather Guide](https://core.telegram.org/bots#6-botfather)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## License

MIT License - see the [LICENSE](LICENSE) file for details.
