export interface StarterOption {
	value: string;
	label: string;
	hint: string;
	template: string;
	isLocal?: boolean;
}

export const starters: StarterOption[] = [
	{
		value: "simple-agent",
		label: "🤖 Simple Agent",
		hint: "Basic agent starter template",
		template: "github:IQAIcom/adk-ts/apps/starter-templates/simple-agent",
		isLocal: false,
	},
	{
		value: "hono-server",
		label: "🌐 Hono Server",
		hint: "Web server with AI agent using Hono framework",
		template: "github:IQAIcom/adk-ts/apps/starter-templates/hono-server",
		isLocal: false,
	},
	{
		value: "telegram-bot",
		label: "📨 Telegram Bot",
		hint: "AI-powered Telegram bot template",
		template: "github:IQAIcom/adk-ts/apps/starter-templates/telegram-bot",
		isLocal: false,
	},
	{
		value: "discord-bot",
		label: "💬 Discord Bot",
		hint: "AI-powered Discord bot template",
		template: "github:IQAIcom/adk-ts/apps/starter-templates/discord-bot",
		isLocal: false,
	},
	{
		value: "mcp-starter",
		label: "🔌 MCP Server",
		hint: "Model Context Protocol server template",
		template: "github:IQAIcom/adk-ts/apps/starter-templates/mcp-starter",
		isLocal: false,
	},
	{
		value: "adk-agent-starter",
		label: "🤖 Legacy ADK Agent Starter",
		hint: "Complete agent development starter template (GitHub)",
		template: "github:IQAIcom/adk-agent-starter",
		isLocal: false,
	},
];
