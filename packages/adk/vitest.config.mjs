import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@adk": resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["**/tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["json", "lcov", "text", "clover", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/index.ts",
				"src/**/*.d.ts",
				"src/llm/registry/providers.ts",
			],
			reportsDirectory: "./coverage",
			// Uncomment when coverage improves:
			/*
			thresholds: {
				branches: 70,
				functions: 80,
				lines: 80,
				statements: 80,
			},
			*/
		},
		setupFiles: ["dotenv/config"],
		testTimeout: 10000,
		clearMocks: true,
		restoreMocks: true,
		exclude: ["**/dist/**", "**/node_modules/**"],
	},
	// Add explicit rollup options to avoid native dependency issues
	optimizeDeps: {
		exclude: ["rollup"],
	},
});
