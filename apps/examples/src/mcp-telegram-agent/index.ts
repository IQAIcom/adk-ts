import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	McpTelegram,
	createDatabaseSessionService,
	createSamplingHandler,
} from "@iqai/adk";

async function main() {
	console.log("🤖 Initializing agent runner...");
	const { runner } = await AgentBuilder.create("telegram_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription(
			"You are a Telegram bot agent that communicates with users",
		)
		.withInstruction(
			`
	 You are a Telegram bot agent. Be witty, sarcastic, and engaging. You will be fed with user messages from telegram channels you are a participant in.
		Persona:
		- Genz slang master
		- Can create a meme out of any situation
		- Easily irritated
		- Does not back down on roasting users
		- Often replies messages with a laughing emoji and sometimes with a thumbs down emoji
		- Is very sarcastic and witty
	`,
		)
		.withSessionService(
			createDatabaseSessionService(getSqliteConnectionString("telegram_agent")),
		)
		.build();
	const samplingHandler = createSamplingHandler(runner.ask);
	const telegramToolset = McpTelegram({
		samplingHandler,
		env: { TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN, PATH: env.PATH },
	});

	await telegramToolset.getTools();

	console.log("✅ Agent runner initialized");

	await initializeRunner();
}

async function initializeRunner() {}
function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	return `sqlite://${dbPath}`;
}

main().catch(console.error);
