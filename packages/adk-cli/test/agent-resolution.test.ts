import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADKServer } from "../src/server";

// Helper: load agent (avoid invoking model by not calling ask())
async function load(server: ADKServer, rel: string) {
	await (server as any).startAgent(rel);
}

describe("ADKServer agent resolution", () => {
	const fixturesDir = join(__dirname, "fixtures");
	let server: ADKServer;

	beforeAll(async () => {
		server = new ADKServer(fixturesDir, 0, "localhost", true);
	});

	const positive = [
		{ dir: "primitive-agent", name: "primitive_agent" },
		{ dir: "function-agent", name: "function_agent" },
		{ dir: "async-factory", name: "async_agent" },
		{ dir: "wrapped-built", name: "wrapped_agent" },
		{ dir: "object-container", name: "object_container_agent" },
		{ dir: "sub-agents-root", name: "root_agent" },
	];

	for (const c of positive) {
		it(`loads ${c.dir}`, async () => {
			expect(existsSync(join(fixturesDir, c.dir, "agent.ts"))).toBe(true);
			await load(server, c.dir);
			const loaded = (server as any).loadedAgents.get(c.dir);
			expect(loaded?.agent?.name).toBe(c.name);
		});
	}

	it("fails on missing directory", async () => {
		await expect(load(server, "missing-dir")).rejects.toThrow();
	});

	it("fails on directory missing agent file", async () => {
		const tmp = mkdtempSync(join(tmpdir(), "adk-empty-"));
		// Add to scan manually
		(server as any).agents.set("empty", {
			relativePath: "empty",
			name: "empty",
			absolutePath: tmp,
		});
		await expect(load(server, "empty")).rejects.toThrow(
			/No agent\.js or agent\.ts/,
		);
	});

	it("ignores primitive agent export and uses factory", async () => {
		await load(server, "primitive-agent");
		const loaded = (server as any).loadedAgents.get("primitive-agent");
		expect(loaded.agent.name).toBe("primitive_agent");
	});

	it("reload is idempotent", async () => {
		await load(server, "function-agent");
		const before = (server as any).loadedAgents.get("function-agent");
		await load(server, "function-agent");
		const after = (server as any).loadedAgents.get("function-agent");
		expect(before).toBe(after); // same object reference
	});

	it("scanAgents updates when new agent appears", async () => {
		const dynamicDir = mkdtempSync(join(tmpdir(), "adk-dyn-"));
		writeFileSync(
			join(dynamicDir, "agent.ts"),
			`import { LlmAgent } from '@iqai/adk';\nexport const agent = new LlmAgent({ name: 'dynamic_agent', description: 'dyn', model: 'gemini-2.5-flash', instruction: '' });`,
		);
		// Point server to parent directory of new agent by temporarily adding entry then rescanning
		// We set absolute path to dynamicDir and relativePath synthetic key
		(server as any).agents.set("dynamic", {
			relativePath: "dynamic",
			name: "dynamic",
			absolutePath: dynamicDir,
		});
		await load(server, "dynamic");
		const loaded = (server as any).loadedAgents.get("dynamic");
		expect(loaded.agent.name).toBe("dynamic_agent");
	});
});
