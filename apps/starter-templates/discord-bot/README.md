# ADK Discord Bot

A Discord bot starter template powered by ADK (AI Development Kit) that enables you to create intelligent, conversational bots for Discord servers. This template provides a solid foundation for building AI-powered Discord bots with persistent conversation memory.

## Features

- 🤖 AI-powered conversations using ADK
- 💬 Discord integration via MCP (Model Context Protocol)
- 🧠 Persistent conversation memory with SQLite
- 🎯 Customizable bot personality and instructions
- ⚡ Hot reload development
- 🧹 Code formatting and linting
- 🔧 TypeScript support
- 📝 Discord markdown support

## Prerequisites

Before you begin, you'll need:

1. **Discord Bot Token**: Create a bot via Discord Developer Portal
2. **AI API Key**: Get an API key for your chosen AI model (e.g., Google AI Studio for Gemini)

## Quick Start

1. **Clone and setup**
   ```bash
   git clone <your-repo>
   cd adk-discord-bot
   pnpm install
   ```

2. **Environment setup**
   ```bash
   cp example.env .env
   # Edit .env with your tokens and API keys
   ```

3. **Configure your bot**
   - Create a Discord application and bot
   - Add the bot token to your `.env` file
   - Invite the bot to your server
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
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here

# AI Model Configuration  
LLM_MODEL=gemini-2.5-flash
GOOGLE_API_KEY=your_google_api_key_here

# Optional
DEBUG=false
```

## Creating Your Discord Bot

### 1. Create Discord Application

1. **Go to [Discord Developer Portal](https://discord.com/developers/applications)**
2. **Click "New Application"**
3. **Give your application a name** (e.g., "My AI Assistant")
4. **Go to the "Bot" section** in the left sidebar
5. **Click "Add Bot"**
6. **Copy the token** under "Token" section
7. **Add the token** to your `.env` file

### 2. Bot Permissions

In the Discord Developer Portal, under "Bot" section:
- **Enable "Message Content Intent"** (required for reading messages)
- **Set appropriate permissions** for your bot's functionality

### 3. Invite Bot to Server

1. **Go to "OAuth2" > "URL Generator"** in Discord Developer Portal
2. **Select "bot" scope**
3. **Select permissions:**
   - Send Messages
   - Read Message History
   - Use Slash Commands (optional)
   - Add Reactions (optional)
4. **Copy the generated URL** and open it in browser
5. **Select your server** and authorize the bot

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

- 📝 **Respond to mentions** (@yourbot message)
- 💬 **Participate in channels** where it has permissions
- 🧠 **Remember conversation context** across messages
- 🎯 **Maintain different contexts** for different users/channels
- 🔄 **Handle multiple conversations** simultaneously
- 📝 **Use Discord markdown** formatting (bold, italic, code blocks)

## Database

The bot uses SQLite for persistent storage:

- **Location**: `src/data/discord_bot.db`
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
    └── discord_bot.db
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
docker build -t discord-bot .
docker run --env-file .env discord-bot
```

### Cloud Platforms
- **Railway**: Simple deployment with persistent storage
- **Heroku**: Classic PaaS deployment
- **DigitalOcean**: VPS deployment
- **AWS/GCP**: Cloud deployment

## Testing Your Bot

1. **Start the bot** with `pnpm dev`
2. **Go to your Discord server** where you invited the bot
3. **Mention the bot** with a message like "@yourbot Hello!"
4. **Check the logs** to see the bot processing messages
5. **Verify responses** are working correctly

## Discord Features

### Markdown Support
Your bot can use Discord markdown:
```
**bold text**
*italic text*
`inline code`
```code blocks```
> quotes
```

### Mentioning Users
```typescript
// In your bot instructions, you can reference Discord features
"When mentioning users, use <@userId> format"
```

### Channel Context
The bot maintains separate conversation contexts for:
- Different Discord servers
- Different channels within servers
- Direct messages with users

## Troubleshooting

### Common Issues

**Bot not responding:**
- Check your `DISCORD_TOKEN` is correct
- Ensure the bot is running (`pnpm dev`)
- Verify bot has "Message Content Intent" enabled
- Check the console for error messages
- Make sure the bot has permissions in the channel

**AI responses not working:**
- Verify your AI API key (e.g., `GOOGLE_API_KEY`)
- Check if the model name is correct
- Ensure you have API credits/quota

**Permission errors:**
- Check bot permissions in Discord server settings
- Ensure bot role is high enough in role hierarchy
- Verify channel-specific permissions

**Database errors:**
- Check write permissions in the `src/data/` directory
- Ensure SQLite is available on your system

### Getting Help

- Check the [ADK Documentation](https://adk.iqai.com)
- Review the console logs for detailed error messages
- Ensure all environment variables are set correctly
- Check [Discord.js Documentation](https://discord.js.org/) for Discord-specific issues

## Examples

### Basic Conversation
```
User: @yourbot Hello!
Bot: Hello! 👋 How can I help you today?

User: @yourbot What's the weather like?
Bot: I don't have access to real-time weather data, but I'd be happy to help you find a weather service or discuss weather-related topics! 🌤️
```

### Channel Discussion
```
User1: @yourbot What do you think about this new feature?
Bot: I'd be happy to share my thoughts! Could you tell me more about what specific aspect of the feature you'd like my opinion on? 🤔

User2: @yourbot Can you help with coding?
Bot: Absolutely! I can help with coding questions. What programming language or specific problem are you working on? 💻
```

### Using Discord Markdown
```
User: @yourbot Show me some formatting
Bot: Here are some Discord formatting options:
**Bold text** for emphasis
*Italic text* for subtle emphasis
`inline code` for short code snippets
```
Multi-line code blocks
for longer code
```
> Quotes for highlighting important text
```

## Learn More

- [ADK Documentation](https://adk.iqai.com)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Discord Bot Guide](https://discord.com/developers/docs/intro)
- [Discord.js Documentation](https://discord.js.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## License

MIT License - see the [LICENSE](LICENSE) file for details.
