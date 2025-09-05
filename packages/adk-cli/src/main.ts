#!/usr/bin/env node
import "reflect-metadata";

import { CommandFactory } from "nest-commander";
import { AppModule } from "./app.module";

// Decide how noisy Nest should be based on the invoked command.
// We only want framework bootstrap logs when actually starting a server
// (serve / run / web). Plain `adk` (help) should be clean.
function selectLogger(): any {
	// Unified rule: stay silent by default to avoid polluting UX.
	// Opt-in via env var for framework level diagnostics.
	if (process.env.ADK_DEBUG_NEST === "1") {
		return ["log", "error", "warn", "debug", "verbose"] as const;
	}
	// Keep errors & warnings only (avoid boot noise like InstanceLoader lines).
	return ["error", "warn"] as const;
}

async function bootstrap() {
	await CommandFactory.run(AppModule, {
		logger: selectLogger(),
	});
}

bootstrap();
