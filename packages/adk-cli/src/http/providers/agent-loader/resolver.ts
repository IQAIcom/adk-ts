import type { AgentBuilder, BaseAgent, BuiltAgent } from "@iqai/adk";
import type {
	AgentExportResult,
	AgentExportValue,
	ModuleExport,
} from "../agent-loader.types";

function isLikelyAgentInstance(obj: unknown): obj is BaseAgent {
	return (
		obj != null &&
		typeof obj === "object" &&
		typeof (obj as BaseAgent).name === "string" &&
		typeof (obj as BaseAgent).runAsync === "function"
	);
}

function isAgentBuilder(obj: unknown): obj is AgentBuilder {
	return (
		obj != null &&
		typeof obj === "object" &&
		typeof (obj as AgentBuilder).build === "function" &&
		typeof (obj as AgentBuilder).withModel === "function"
	);
}

function isBuiltAgent(obj: unknown): obj is BuiltAgent {
	return (
		obj != null &&
		typeof obj === "object" &&
		"agent" in obj &&
		"runner" in obj &&
		"session" in obj
	);
}

function isPrimitive(
	v: unknown,
): v is null | undefined | string | number | boolean {
	return v == null || ["string", "number", "boolean"].includes(typeof v);
}

async function invokeFunctionSafely(
	fn: () => AgentExportValue,
): Promise<AgentExportValue> {
	let result: unknown = fn();
	if (result && typeof result === "object" && "then" in result) {
		try {
			result = await (result as Promise<AgentExportValue>);
		} catch (e) {
			throw new Error(
				`Failed to await function result: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}
	return result as AgentExportValue;
}

async function extractBaseAgent(
	item: unknown,
): Promise<AgentExportResult | null> {
	if (isLikelyAgentInstance(item)) return { agent: item as BaseAgent };
	if (isAgentBuilder(item)) {
		const built = await (item as AgentBuilder).build();
		return { agent: built.agent, builtAgent: built };
	}
	if (isBuiltAgent(item)) {
		const builtItem = item as BuiltAgent;
		return { agent: builtItem.agent, builtAgent: builtItem };
	}
	return null;
}

async function scanModuleExports(
	mod: ModuleExport,
): Promise<AgentExportResult | null> {
	for (const [key, value] of Object.entries(mod)) {
		if (key === "default") continue;
		const keyLower = key.toLowerCase();
		if (isPrimitive(value)) continue;

		const result = await extractBaseAgent(value);
		if (result) return result;

		if (value && typeof value === "object" && "agent" in value) {
			const container = value as ModuleExport;
			const containerResult = await extractBaseAgent(container.agent);
			if (containerResult) return containerResult;
		}

		if (
			typeof value === "function" &&
			(() => {
				if (/(agent|build|create)/i.test(keyLower)) return true;
				const fnLike = value as { name?: string };
				const fnName = fnLike?.name;
				return !!(fnName && /(agent|build|create)/i.test(fnName.toLowerCase()));
			})()
		) {
			try {
				const functionResult = await invokeFunctionSafely(
					value as () => AgentExportValue,
				);
				const r = await extractBaseAgent(functionResult);
				if (r) return r;

				if (
					functionResult &&
					typeof functionResult === "object" &&
					"agent" in functionResult
				) {
					const containerResult = await extractBaseAgent(
						(functionResult as { agent: unknown }).agent,
					);
					if (containerResult) return containerResult;
				}
			} catch {
				// swallow
			}
		}
	}
	return null;
}

async function tryResolvingDirectCandidate(
	candidateToResolve: unknown,
	mod: ModuleExport,
): Promise<AgentExportResult | null> {
	if (
		isPrimitive(candidateToResolve) ||
		(candidateToResolve && candidateToResolve === (mod as unknown))
	) {
		return null;
	}
	const result = await extractBaseAgent(candidateToResolve);
	if (result) return result;

	if (
		candidateToResolve &&
		typeof candidateToResolve === "object" &&
		"agent" in candidateToResolve
	) {
		const container = candidateToResolve as ModuleExport;
		return await extractBaseAgent(container.agent);
	}
	return null;
}

async function tryResolvingFunctionCandidate(
	functionCandidate: unknown,
): Promise<AgentExportResult | null> {
	try {
		const functionResult = await invokeFunctionSafely(
			functionCandidate as () => AgentExportValue,
		);
		const r = await extractBaseAgent(functionResult);
		if (r) return r;
		if (
			functionResult &&
			typeof functionResult === "object" &&
			"agent" in functionResult
		) {
			const containerResult = await extractBaseAgent(
				(functionResult as { agent: unknown }).agent,
			);
			if (containerResult) return containerResult;
		}
	} catch (e) {
		throw new Error(
			`Failed executing exported agent function: ${e instanceof Error ? e.message : String(e)}`,
		);
	}
	return null;
}

export async function resolveAgentExport(
	mod: ModuleExport,
): Promise<AgentExportResult> {
	const moduleDefault =
		mod.default && typeof mod.default === "object"
			? (mod.default as ModuleExport)
			: undefined;
	const candidateToResolve: unknown =
		mod.agent ?? moduleDefault?.agent ?? moduleDefault ?? mod;

	const directResult = await tryResolvingDirectCandidate(
		candidateToResolve,
		mod,
	);
	if (directResult) return directResult;

	const exportResult = await scanModuleExports(mod);
	if (exportResult) return exportResult;

	if (typeof candidateToResolve === "function") {
		const functionResult =
			await tryResolvingFunctionCandidate(candidateToResolve);
		if (functionResult) return functionResult;
	}
	throw new Error(
		"No agent export resolved (expected BaseAgent, AgentBuilder, or BuiltAgent)",
	);
}
