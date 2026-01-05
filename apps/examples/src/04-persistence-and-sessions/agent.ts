import {
	AgentBuilder,
	InMemoryArtifactService,
	LoadArtifactsTool,
	createDatabaseSessionService,
	createTool,
} from "@iqai/adk";
import * as fs from "node:fs";
import * as path from "node:path";
import dedent from "dedent";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";

function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(process.cwd(), "data", `${dbName}.db`);
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	return `sqlite:${dbPath}`;
}

const saveArtifactTool = createTool({
	name: "save_artifact",
	description: "Save content as an artifact file",
	schema: z.object({
		filename: z.string().describe("Name of the file to save"),
		content: z.string().describe("Content to save in the file"),
	}),
	fn: async ({ filename, content }, context) => {
		const part = { text: content };
		const version = await context.saveArtifact(filename, part);
		return {
			success: true,
			version,
			message: `Saved artifact: ${filename}`,
		};
	},
});

export async function agent() {
	const sessionService = createDatabaseSessionService(
		getSqliteConnectionString("sessions"),
	);
	const artifactService = new InMemoryArtifactService();

	const { runner } = await AgentBuilder.create("persistence_agent")
		.withModel("gemini-2.5-flash")
		.withDescription("Agent with persistent sessions and artifacts")
		.withInstruction(
			dedent`
			You are a persistent assistant with access to file storage.
			Help users save and manage their files and information.
		`,
		)
		.withTools(saveArtifactTool, new LoadArtifactsTool())
		.withSessionService(sessionService, {
			userId: uuidv4(),
			appName: "persistence-example",
		})
		.withArtifactService(artifactService)
		.build();

	return runner;
}
