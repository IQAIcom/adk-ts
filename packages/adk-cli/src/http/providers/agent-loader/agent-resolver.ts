import { AgentBuilder, BaseAgent, BuiltAgent } from "@iqai/adk";
import { Logger } from "@nestjs/common";
import { TypeGuards } from "./type-guards";

export class AgentResolver {
	constructor(
		private logger: Logger,
		private quiet: boolean,
		private guards: TypeGuards,
	) {}

	private async invokeFunctionSafely(fn: () => unknown): Promise<unknown> {
		let result = fn();
		if (result && typeof result === "object" && "then" in (result as any)) {
			result = await (result as any);
		}
		return result;
	}

	private async extractBaseAgent(item: unknown): Promise<BaseAgent | null> {
		if (this.guards.isLikelyAgentInstance(item)) return item;
		if (this.guards.isAgentBuilder(item))
			return (await (item as AgentBuilder).build()).agent;
		if (this.guards.isBuiltAgent(item)) return (item as BuiltAgent).agent;
		return null;
	}

	private async scanModuleExports(
		mod: Record<string, unknown>,
	): Promise<BaseAgent | null> {
		for (const [key, value] of Object.entries(mod)) {
			if (key === "default" || this.guards.isPrimitive(value)) continue;

			const found = await this.extractBaseAgent(value);
			if (found) return found;

			if (value && typeof value === "object" && "agent" in (value as any)) {
				const inner = await this.extractBaseAgent((value as any).agent);
				if (inner) return inner;
			}

			if (typeof value === "function" && /(agent|build|create)/i.test(key)) {
				try {
					const result = await this.invokeFunctionSafely(
						value as () => unknown,
					);
					const inner = await this.extractBaseAgent(result);
					if (inner) return inner;
					if (
						result &&
						typeof result === "object" &&
						"agent" in (result as any)
					) {
						const nested = await this.extractBaseAgent((result as any).agent);
						if (nested) return nested;
					}
				} catch {}
			}
		}
		return null;
	}

	private async tryResolvingDirectCandidate(
		candidate: unknown,
		mod: Record<string, unknown>,
	): Promise<BaseAgent | null> {
		if (this.guards.isPrimitive(candidate) || candidate === mod) return null;
		const direct = await this.extractBaseAgent(candidate);
		if (direct) return direct;

		if (
			candidate &&
			typeof candidate === "object" &&
			"agent" in (candidate as any)
		)
			return await this.extractBaseAgent((candidate as any).agent);

		return null;
	}

	private async tryResolvingFunctionCandidate(
		fnCandidate: unknown,
	): Promise<BaseAgent | null> {
		try {
			const result = await this.invokeFunctionSafely(
				fnCandidate as () => unknown,
			);
			const agent = await this.extractBaseAgent(result);
			if (agent) return agent;

			if (result && typeof result === "object" && "agent" in (result as any))
				return await this.extractBaseAgent((result as any).agent);
		} catch (e) {
			throw new Error(
				`Failed executing exported agent function: ${
					e instanceof Error ? e.message : String(e)
				}`,
			);
		}
		return null;
	}

	async resolveAgentExport(mod: Record<string, unknown>): Promise<BaseAgent> {
		const moduleDefault = (mod as any)?.default as
			| Record<string, unknown>
			| undefined;
		const candidate =
			(mod as any)?.agent ??
			(moduleDefault as any)?.agent ??
			moduleDefault ??
			mod;

		const direct = await this.tryResolvingDirectCandidate(candidate, mod);
		if (direct) return direct;

		const scanned = await this.scanModuleExports(mod);
		if (scanned) return scanned;

		if (typeof candidate === "function") {
			const fnResult = await this.tryResolvingFunctionCandidate(candidate);
			if (fnResult) return fnResult;
		}

		throw new Error(
			"No agent export resolved (expected BaseAgent, AgentBuilder, or BuiltAgent)",
		);
	}
}
