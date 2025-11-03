#!/usr/bin/env node
import "reflect-metadata";

import { CommandFactory } from "nest-commander";
import { AppModule } from "./app.module";
import { envSchema } from "./common/schema";

// Lightweight, dependency-free version flag handling executed before Nest bootstraps.
// Supports: adk --version | adk -v | adk -V
// Intentionally done here (instead of commander integration) to avoid spinning up
// the Nest container for a trivial, frequently used query.
try {
	if (process.argv.some((a) => a === "--version" || a === "-v" || a === "-V")) {
		const pkg = require("../package.json");
		// Print just the version to stay script-friendly (e.g., `adk --version` in tooling)
		// Common CLIs output only the version number; adjust if branding desired.
		console.log(pkg.version || "unknown");
		process.exit(0);
	}
} catch {
	// Silently ignore and continue to normal bootstrap if something unexpected happens.
}

// Decide how noisy Nest should be based on the invoked command.
// We only want framework bootstrap logs when actually starting a server
// (serve / run / web). Plain `adk` (help) should be clean.
function selectLogger(): any {
	const env = envSchema.parse(process.env);
	const debug = env.ADK_DEBUG;
	// Unified rule: stay silent by default to avoid polluting UX.
	// Opt-in via env var for framework level diagnostics.

	if (debug) {
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
