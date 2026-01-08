import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	AgentBuilder,
	createDatabaseSessionService,
	InMemoryArtifactService,
} from "@iqai/adk";
import { counterTool, saveCounterReportTool } from "./tools";

export async function getRootAgent() {
	const dbDir = path.join(os.tmpdir(), "adk-examples");
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	const sessionService = createDatabaseSessionService(
		getSqliteConnectionString("sessions"),
	);
	const artifactService = new InMemoryArtifactService();

	return await AgentBuilder.withModel(
		process.env.LLM_MODEL || "gemini-3-flash-preview",
	)
		.withTools(counterTool, saveCounterReportTool)
		.withSessionService(sessionService)
		.withArtifactService(artifactService)
		.withEventsCompaction({
			compactionInterval: 3,
			overlapSize: 1,
		})
		.build();
}

function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(os.tmpdir(), "adk-examples", `${dbName}.db`);
	return `sqlite://${dbPath}`;
}
