import { AgentBuilder, BaseAgent, BuiltAgent } from "@iqai/adk";

export class TypeGuards {
	isLikelyAgentInstance(obj: unknown): obj is BaseAgent {
		return (
			obj != null &&
			typeof obj === "object" &&
			typeof (obj as BaseAgent).name === "string" &&
			typeof (obj as BaseAgent).runAsync === "function"
		);
	}

	isAgentBuilder(obj: unknown): obj is AgentBuilder {
		return (
			obj != null &&
			typeof obj === "object" &&
			typeof (obj as AgentBuilder).build === "function" &&
			typeof (obj as AgentBuilder).withModel === "function"
		);
	}

	isBuiltAgent(obj: unknown): obj is BuiltAgent {
		return (
			obj != null &&
			typeof obj === "object" &&
			"agent" in (obj as any) &&
			"runner" in (obj as any) &&
			"session" in (obj as any)
		);
	}

	isPrimitive(v: unknown): v is null | undefined | string | number | boolean {
		return v == null || ["string", "number", "boolean"].includes(typeof v);
	}
}
