import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs/promises";
import { AgentBuilder, AgentEvaluator, createTool } from "@iqai/adk";
import * as z from "zod";
import { env } from "node:process";

const DEFAULT_MODEL = env.LLM_MODEL || "gemini-2.5-flash";
const PRINT_DETAILS_VALUES = new Set(["1", "true", "yes"]);

function shouldPrintDetails(): boolean {
	return PRINT_DETAILS_VALUES.has((env.PRINT_EVAL_DETAILS || "").toLowerCase());
}

function getStrictInstruction(): string {
	return [
		"You are a precise answer generator. Follow these rules strictly:",
		"1) If the prompt asks for a single number, output only the number. No words, symbols, or explanation.",
		"2) If the prompt asks for N words exactly, output exactly N words separated by single spaces. No extra words, no punctuation before/after.",
		"3) If the prompt asks for JSON, output a single compact JSON object with only the requested keys and minimal spaces. No code fences, no backticks, no surrounding text.",
		"4) Preserve specified ordering exactly in enumerations (e.g., Red Green Blue).",
		"5) Never wrap answers in Markdown code fences.",
		"6) Be concise and comply exactly with formatting instructions.",
	].join("\n");
}

async function buildStrictAgent() {
	const { agent } = await AgentBuilder.create("demo_agent")
		.withModel(DEFAULT_MODEL)
		.withInstruction(getStrictInstruction())
		.build();
	return agent;
}

async function findTestFiles(startDir: string): Promise<string[]> {
	const results: string[] = [];
	const stack: string[] = [startDir];
	while (stack.length) {
		const current = stack.pop()!;
		const entries = await fs.readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			const full = join(current, entry.name);
			if (entry.isDirectory()) stack.push(full);
			else if (entry.isFile() && entry.name.endsWith(".test.json"))
				results.push(full);
		}
	}
	return results;
}

function hasExpectedToolUses(evalSet: any): boolean {
	return evalSet.evalCases?.some(
		(c: any) =>
			Array.isArray(c.conversation) &&
			c.conversation.some(
				(inv: any) =>
					inv?.intermediateData?.toolUses &&
					inv.intermediateData.toolUses.length > 0,
			),
	);
}

async function buildToolsDemoAgent() {
	const echoTool = createTool({
		name: "echo",
		description: "Echo back provided text exactly",
		schema: z.object({ text: z.string() }),
		fn: ({ text }) => text,
	});

	const built = await AgentBuilder.create("tools_demo_agent")
		.withModel(DEFAULT_MODEL)
		.withInstruction(
			[
				"You can call tools when appropriate.",
				"When asked to echo text, always call the 'echo' tool with field 'text' and return its output as final response.",
				"Do not fabricate tool outputs; prefer the tool result.",
			].join("\n"),
		)
		.withTools(echoTool)
		.build();
	return built.agent;
}

function computeEffectiveCriteria(
	evalSet: any,
	baseCriteria: Record<string, number>,
	testFile: string,
): Record<string, number> {
	let effective: Record<string, number> = { ...baseCriteria };

	const expectsTools = hasExpectedToolUses(evalSet);
	if (!expectsTools && effective.tool_trajectory_avg_score !== undefined) {
		const { tool_trajectory_avg_score, ...rest } = effective as any;
		effective = rest;
		console.warn(
			`Skipping tool_trajectory_avg_score for ${testFile} (no expected tool uses present)`,
		);
	}

	const hasGcp = !!(env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_LOCATION);
	if (!hasGcp && effective.safety_v1 !== undefined) {
		const { safety_v1, ...rest } = effective as any;
		effective = rest;
		console.warn(
			`Skipping safety_v1 for ${testFile} (set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION to enable)`,
		);
	}

	return effective;
}

/**
 * Minimal Evaluation Example
 *
 * Demonstrates how to:
 * 1. Create a simple agent
 * 2. Create a minimal evaluation dataset + config
 * 3. Run evaluation using AgentEvaluator (throws on failure)
 */
export async function main() {
	console.log("🧪 Running evaluation...");

	const agent = await buildStrictAgent();
	const dir = dirname(fileURLToPath(import.meta.url));
	const printDetails = shouldPrintDetails();

	try {
		if (!printDetails) {
			await AgentEvaluator.evaluate(agent, dir, 1);
			console.log("✅ Passed");
			return;
		}

		const testFiles = await findTestFiles(dir);
		let hadFailure = false;

		for (const testFile of testFiles) {
			const raw = await fs.readFile(testFile, "utf-8");
			const evalSet = JSON.parse(raw);
			if (!evalSet.evalSetId || !Array.isArray(evalSet.evalCases)) {
				console.warn(`Skipping ${testFile} (not EvalSet schema)`);
				continue;
			}

			const baseCriteria = await AgentEvaluator.findConfigForTestFile(testFile);
			const effectiveCriteria = computeEffectiveCriteria(
				evalSet,
				baseCriteria,
				testFile,
			);

			const agentForThisTest = hasExpectedToolUses(evalSet)
				? await buildToolsDemoAgent()
				: agent;

			try {
				await AgentEvaluator.evaluateEvalSet(
					agentForThisTest,
					evalSet,
					effectiveCriteria,
					1,
					true,
				);
				console.log(`✅ Passed: ${testFile}`);
			} catch (error) {
				hadFailure = true;
				console.error(`❌ Failed: ${testFile}`);
				console.error(error instanceof Error ? error.message : error);
			}
		}

		if (!hadFailure) {
			console.log("✅ All eval files passed");
		}
	} catch (err) {
		console.error("❌ Failed:", err instanceof Error ? err.message : err);
	}
}

if (require.main === module) {
	main().catch(console.error);
}
