import { BaseAgent, CallbackContext } from "@adk/agents";
import { BaseTool, ToolContext } from "@adk/tools";
import { Content } from "@google/genai";
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
	errorClassifier?: (error: unknown) => boolean; // Only trip circuit on these errors
	cooldownStrategy?: "fixed" | "adaptive";
	maxCooldownMs?: number;
}

export class CircuitBreakerPlugin extends BasePlugin {
	private failureThreshold: number;
	private cooldownTimeMs: number;
	private scope: CircuitBreakerScope;
	private throwOnOpen: boolean;
	private errorClassifier?: (error: unknown) => boolean;
	private cooldownStrategy: "fixed" | "adaptive";
	private maxCooldownMs: number;

	private toolCircuits: Record<string, CircuitState> = {};
	private agentCircuits: Record<string, CircuitState> = {};
	private static GLOBAL_KEY = "__global_circuit__";

	constructor({
		name = "circuit_breaker_plugin",
		failureThreshold = 3,
		cooldownTimeMs = 60000,
		scope = CircuitBreakerScope.INVOCATION,
		throwOnOpen = true,
		errorClassifier,
		cooldownStrategy = "fixed",
		maxCooldownMs = 60000,
	}: CircuitBreakerPluginOptions = {}) {
		super(name);
		this.failureThreshold = failureThreshold;
		this.cooldownTimeMs = cooldownTimeMs;
		this.scope = scope;
		this.throwOnOpen = throwOnOpen;
		this.errorClassifier = errorClassifier;
		this.cooldownStrategy = cooldownStrategy;
		this.maxCooldownMs = maxCooldownMs;
	}

	/** Compute the key used to store circuit state */
	private _getKey(contextId: string, name: string) {
		return this.scope === CircuitBreakerScope.GLOBAL
			? `${CircuitBreakerPlugin.GLOBAL_KEY}:${name}`
			: `${contextId}:${name}`;
	}

	/** Get or initialize circuit state */
	private _getState(
		map: Record<string, CircuitState>,
		key: string,
	): CircuitState {
		if (!map[key]) {
			map[key] = {
				state: CircuitStateType.CLOSED,
				failures: 0,
				lastFailureTime: 0,
			};
		}
		return map[key];
	}

	/** Determine if an error should be recorded as failure */
	private _shouldRecordFailure(error: unknown): boolean {
		if (!error) return true;
		if (this.errorClassifier) return this.errorClassifier(error);
		return true; // default: all errors trip circuit
	}

	/** Get cooldown duration in ms */
	private _getCooldownTimeMs(error?: any): number {
		if (
			this.cooldownStrategy === "adaptive" &&
			error?.response?.headers?.["retry-after"]
		) {
			const retryAfter = Number(error.response.headers["retry-after"]);
			if (!Number.isNaN(retryAfter)) {
				return Math.min(retryAfter * 1000, this.maxCooldownMs);
			}
		}
		return this.cooldownTimeMs;
	}

	/** Enter different circuit states */
	private _enterOpenState(state: CircuitState, error?: any) {
		state.state = CircuitStateType.OPEN;
		state.lastFailureTime = Date.now() + this._getCooldownTimeMs(error);
	}

	private _enterHalfOpenState(state: CircuitState) {
		state.state = CircuitStateType.HALF_OPEN;
	}

	private _enterClosedState(state: CircuitState) {
		state.state = CircuitStateType.CLOSED;
		state.failures = 0;
		state.lastFailureTime = 0;
	}

	/** Check if call can proceed */
	private _canAttemptCall(state: CircuitState): boolean {
		const now = Date.now();
		switch (state.state) {
			case CircuitStateType.CLOSED:
				return true;
			case CircuitStateType.OPEN:
				if (now >= state.lastFailureTime) {
					this._enterHalfOpenState(state);
					return true;
				}
				return false;
			case CircuitStateType.HALF_OPEN:
				// allow only one trial call
				return state.failures <= this.failureThreshold;
			default:
				return false;
		}
	}

	/** Record a failure and potentially open circuit */
	private _recordFailure(state: CircuitState, error?: unknown) {
		if (!this._shouldRecordFailure(error)) return;

		state.failures += 1;

		if (state.state === CircuitStateType.HALF_OPEN) {
			this._enterOpenState(state, error);
			return;
		}

		if (state.failures >= this.failureThreshold) {
			this._enterOpenState(state, error);
		}
	}

	/** Record success and reset circuit */
	private _recordSuccess(state: CircuitState) {
		this._enterClosedState(state);
	}

	/** --- Agent Callbacks --- */
	async beforeAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
	}): Promise<Content | undefined> {
		const key = this._getKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);
		const state = this._getState(this.agentCircuits, key);

		if (!this._canAttemptCall(state)) {
			if (this.throwOnOpen) {
				throw new Error(`Circuit breaker open for agent ${params.agent.name}`);
			}
			return { parts: [] }; // block call silently
		}

		return undefined;
	}

	async afterAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
		result?: any;
	}): Promise<Content | undefined> {
		const key = this._getKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);
		const state = this._getState(this.agentCircuits, key);
		this._recordSuccess(state);
		return undefined;
	}

	async onAgentErrorCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
		error: unknown;
	}): Promise<Content | undefined> {
		const key = this._getKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);
		const state = this._getState(this.agentCircuits, key);
		this._recordFailure(state, params.error);
		throw params.error;
	}

	/** --- Tool Callbacks --- */
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
			return {}; // silently block
		}

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

	async onToolErrorCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		error: unknown;
	}): Promise<Record<string, any> | undefined> {
		const key = this._getKey(params.toolContext.invocationId, params.tool.name);
		const state = this._getState(this.toolCircuits, key);
		this._recordFailure(state, params.error);
		throw params.error;
	}

	/** --- Public Helpers --- */

	/** Reset a circuit manually */
	resetCircuit(key: string, isAgent = true) {
		const map = isAgent ? this.agentCircuits : this.toolCircuits;
		if (map[key]) this._enterClosedState(map[key]);
	}
}
