import {
	AgentBuilder,
	createDatabaseSessionService,
	InMemoryArtifactService,
} from "@iqai/adk";
import * as path from "node:path";
import * as fs from "node:fs";
import { counterTool } from "./tools";

export function getRootAgent() {
	const sessionService = createDatabaseSessionService(
		getSqliteConnectionString("sessions"),
	);
	const artifactService = new InMemoryArtifactService();

	return AgentBuilder.withModel("gemini-2.5-flash")
		.withTools(counterTool)
		.withSessionService(sessionService)
		.withArtifactService(artifactService)
		.withEventsCompaction({
			compactionInterval: 3,
			overlapSize: 1,
		})
		.build();
}

function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	return `sqlite:${dbPath}`;
}
