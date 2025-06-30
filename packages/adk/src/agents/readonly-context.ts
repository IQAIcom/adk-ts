import type { Content } from "@google/genai";
import type { InvocationContext } from "./invocation-context";

/**
 * Base readonly context class.
 */
export class ReadonlyContext {
	protected readonly _invocationContext: InvocationContext;

	constructor(invocationContext: InvocationContext) {
		this._invocationContext = invocationContext;
	}

	/**
	 * The user content that started this invocation. READONLY field.
	 */
	get userContent(): Content | undefined {
		return this._invocationContext.userContent;
	}

	/**
	 * The current invocation id.
	 */
	get invocationId(): string {
		return this._invocationContext.invocationId;
	}

	/**
	 * The name of the agent that is currently running.
	 */
	get agentName(): string {
		return this._invocationContext.agent.name;
	}

	/**
	 * The state of the current session. READONLY field.
	 */
	get state(): Readonly<Record<string, any>> {
		// Create a readonly proxy similar to Python's MappingProxyType
		return Object.freeze({ ...this._invocationContext.session.state });
	}
}
