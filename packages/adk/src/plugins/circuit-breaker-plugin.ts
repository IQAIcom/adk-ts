import { BaseAgent, CallbackContext } from "@adk/agents";
import { BaseTool, ToolContext } from "@adk/tools";
import { BasePlugin } from "./base-plugin";

export enum CircuitBreakerScope {
	INVOCATION = "invocation",
	GLOBAL = "global",
}

enum CircuitStateType {
	CLOSED = "closed",
	OPEN = "open",
	HALF_OPEN = "half_open",
}

interface CircuitState {
	state: CircuitStateType;
	failures: number;
	lastFailureTime: number; // timestamp of last failure
}

export interface CircuitBreakerPluginOptions {
	name?: string;
	failureThreshold?: number;
	cooldownTimeMs?: number;
	scope?: CircuitBreakerScope;
	throwOnOpen?: boolean;
}

export class CircuitBreakerPlugin extends BasePlugin {
	private failureThreshold: number;
	private cooldownTimeMs: number;
	private scope: CircuitBreakerScope;
	private throwOnOpen: boolean;

	private toolCircuits: Record<string, CircuitState> = {};
	private agentCircuits: Record<string, CircuitState> = {};
	private static GLOBAL_KEY = "__global_circuit__";

	constructor({
		name = "circuit_breaker_plugin",
		failureThreshold = 3,
		cooldownTimeMs = 60000,
		scope = CircuitBreakerScope.INVOCATION,
		throwOnOpen = true,
	}: CircuitBreakerPluginOptions = {}) {
		super(name);
		this.failureThreshold = failureThreshold;
		this.cooldownTimeMs = cooldownTimeMs;
		this.scope = scope;
		this.throwOnOpen = throwOnOpen;
	}

	private _getKey(contextId: string, name: string) {
		return this.scope === CircuitBreakerScope.GLOBAL
			? `${CircuitBreakerPlugin.GLOBAL_KEY}:${name}`
			: `${contextId}:${name}`;
	}

	private _getState(
		map: Record<string, CircuitState>,
		key: string,
	): CircuitState {
		if (!map[key])
			map[key] = {
				state: CircuitStateType.CLOSED,
				failures: 0,
				lastFailureTime: 0,
			};
		return map[key];
	}

	private _enterOpenState(state: CircuitState) {
		state.state = CircuitStateType.OPEN;
		state.lastFailureTime = Date.now();
	}

	private _enterHalfOpenState(state: CircuitState) {
		state.state = CircuitStateType.HALF_OPEN;
	}

	private _enterClosedState(state: CircuitState) {
		state.state = CircuitStateType.CLOSED;
		state.failures = 0;
		state.lastFailureTime = 0;
	}

	private _canAttemptCall(state: CircuitState): boolean {
		const now = Date.now();
		switch (state.state) {
			case CircuitStateType.CLOSED:
				return true;
			case CircuitStateType.OPEN:
				if (now - state.lastFailureTime >= this.cooldownTimeMs) {
					this._enterHalfOpenState(state);
					return true;
				}
				return false;
			case CircuitStateType.HALF_OPEN:
				return true;
		}
		return false;
	}

	private _recordFailure(state: CircuitState) {
		state.failures += 1;
		if (state.failures >= this.failureThreshold) {
			this._enterOpenState(state);
		} else if (state.state === CircuitStateType.HALF_OPEN) {
			// failure during half-open -> open again
			this._enterOpenState(state);
		}
	}

	private _recordSuccess(state: CircuitState) {
		this._enterClosedState(state);
	}

	// --- Tool callbacks ---
	async beforeToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
	}): Promise<Record<string, any> | undefined> {
		const key = this._getKey(params.toolContext.invocationId, params.tool.name);
		const state = this._getState(this.toolCircuits, key);

		if (!this._canAttemptCall(state)) {
			if (this.throwOnOpen)
				throw new Error(`Circuit breaker open for tool ${params.tool.name}`);
			return {}; // silently block call
		}
		return undefined;
	}

	async onToolErrorCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		error: any;
	}): Promise<Record<string, any> | undefined> {
		const key = this._getKey(params.toolContext.invocationId, params.tool.name);
		const state = this._getState(this.toolCircuits, key);
		this._recordFailure(state);

		if (this.throwOnOpen) throw params.error;
		return undefined;
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		result: any;
	}): Promise<Record<string, any> | undefined> {
		const key = this._getKey(params.toolContext.invocationId, params.tool.name);
		const state = this._getState(this.toolCircuits, key);
		this._recordSuccess(state);
		return undefined;
	}

	// --- Agent callbacks ---
	async beforeAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
	}) {
		const key = this._getKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);
		const state = this._getState(this.agentCircuits, key);

		if (!this._canAttemptCall(state)) {
			if (this.throwOnOpen)
				throw new Error(`Circuit breaker open for agent ${params.agent.name}`);
		}

		return undefined;
	}

	async afterAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
		result?: any;
	}) {
		const key = this._getKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);
		const state = this._getState(this.agentCircuits, key);
		this._recordSuccess(state);

		return undefined;
	}
}
