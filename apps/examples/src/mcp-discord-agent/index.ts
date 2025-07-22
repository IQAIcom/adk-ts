import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	McpDiscord,
	createDatabaseSessionService,
	createSamplingHandler,
} from "@iqai/adk";

async function main() {
	console.log("🤖 Initializing agent runner...");
	const { runner } = await AgentBuilder.create("discord_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("You are a Discord bot agent that communicates with users")
		.withInstruction(
			`
	 You are a Discord bot agent. Be witty, sarcastic, and engaging. You will be fed with user messages from discord channels you are a participant in.
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
			createDatabaseSessionService(getSqliteConnectionString("discord_agent")),
		)
		.build();
	const samplingHandler = createSamplingHandler(runner.ask);
	const discordToolset = McpDiscord({
		samplingHandler,
		env: { DISCORD_TOKEN: env.DISCORD_TOKEN, PATH: env.PATH },
	});

	await discordToolset.getTools();

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
