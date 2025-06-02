import { Agent } from "@adk/agents";

export class TelegramNotifierAgent extends Agent {
	constructor(telegramTools: any[]) {
		super({
			name: "telegram_notifier",
			model: process.env.LLM_MODEL || "gemini-2.5-pro",
			description:
				"Sends comprehensive investment reports and notifications to Telegram",
			instructions: `
				You send investment notifications to Telegram using the exact format specified.

				STEPS:
				1. Review all previous workflow results
				2. Prepare message using the exact format below
				3. Send message using Telegram MCP tool

				REQUIRED MESSAGE FORMAT (use exactly this):
				🌟 ATP Agent Purchase Log

				✅ Buy Transaction Successful

				💰 Amount: [amount] IQ
				🤖 Agent: [agent name]
				🔗 View on Explorer: https://fraxscan.com/tx/[transaction_hash]

				If transaction failed, use:
				🌟 ATP Agent Purchase Log

				❌ Buy Transaction Failed

				💰 Attempted: [amount] IQ
				🤖 Agent: [agent name]
				❌ Error: [error message]

				Use Telegram tool parameters:
				- chatId: process.env.TELEGRAM_CHAT_ID
				- text: [the formatted message above]

				RESPONSE FORMAT:
				📱 TELEGRAM NOTIFICATION

				Sending message...
				[Call Telegram send message tool here]

				Status: [SENT/FAILED]
				Message: [confirmation of delivery]

				TELEGRAM_NOTIFICATION_COMPLETE
			`,
			tools: telegramTools,
			maxToolExecutionSteps: 2,
		});
	}
}
