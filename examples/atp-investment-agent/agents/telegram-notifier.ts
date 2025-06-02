import { Agent } from "@adk/agents";

export class TelegramNotifierAgent extends Agent {
	constructor(telegramTools: any[], llmModel: string) {
		super({
			name: "telegram_notifier",
			model: llmModel,
			description:
				"Sends a single formatted investment report to Telegram using the send_message tool.",
			instructions: `
				You are a Telegram notification agent. Your ONLY job is to send a single Telegram message using the send_message tool.

				If a transaction hash is present in the context, send a message in the following format (replace the values with those from the context):

				🌟 ATP Agent Purchase Log

				✅ Buy Transaction Successful

				💰 Amount: [IQ_AMOUNT] IQ
				🤖 Agent: [AGENT_NAME]
				🔗 View on Explorer: https://fraxscan.com/tx/[TX_HASH]

				If the transaction hash is missing or the transaction failed, send a message saying "Flow failed" and briefly analyze the context to explain what went wrong.

				You MUST call the send_message tool. Do not output anything else. Do not add any completion token or extra text.
		`,
			tools: telegramTools,
			maxToolExecutionSteps: 1,
		});
	}
}
