// State module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the state functionality from the Python SDK

/**
 * A state object that maintains the current value and the pending-commit delta.
 *
 * This class provides app-level, user-level, and session-level state management
 * with prefixes to distinguish between them.
 */
export class State {
	/**
	 * Prefix for app-level state keys.
	 */
	static readonly APP_PREFIX = "app:";

	/**
	 * Prefix for user-level state keys.
	 */
	static readonly USER_PREFIX = "user:";

	/**
	 * Prefix for temporary state keys.
	 */
	static readonly TEMP_PREFIX = "temp:";

	/**
	 * The current value of the state.
	 */
	private _value: Record<string, unknown>;

	/**
	 * The delta change to the current value that hasn't been committed.
	 */
	private _delta: Record<string, unknown>;

	/**
	 * Creates a new State instance.
	 *
	 * @param value The current value of the state
	 * @param delta The delta change to the current value that hasn't been committed
	 */
	constructor(
		value?: Record<string, unknown>,
		delta?: Record<string, unknown>,
	) {
		this._value = value || {};
		this._delta = delta || {};
	}

	/**
	 * Creates a new state from a plain object.
	 *
	 * @param obj The object to create the state from
	 * @returns A new state instance
	 */
	static fromObject(obj?: Record<string, unknown>): State {
		return new State(obj || {}, {});
	}

	/**
	 * Sets a value in the state.
	 *
	 * @param key The key to set
	 * @param value The value to set
	 */
	set(key: string, value: unknown): void {
		this._value[key] = value;
		this._delta[key] = value;
	}

	/**
	 * Gets a value from the state.
	 *
	 * @param key The key to get
	 * @returns The value for the key or undefined if not found
	 */
	get(key: string): unknown {
		if (key in this._delta) {
			return this._delta[key];
		}

		if (key in this._value) {
			return this._value[key];
		}

		return undefined;
	}

	/**
	 * Checks if the state has a value for the given key.
	 *
	 * @param key The key to check
	 * @returns Whether the state has a value for the key
	 */
	hasValue(key: string): boolean {
		return key in this._delta || key in this._value;
	}

	/**
	 * Checks if the state has any values.
	 *
	 * @returns Whether the state has any values
	 */
	hasAny(): boolean {
		return (
			Object.keys(this._value).length > 0 || Object.keys(this._delta).length > 0
		);
	}

	/**
	 * Checks if the state has any pending changes.
	 *
	 * @returns Whether the state has any pending changes
	 */
	hasDelta(): boolean {
		return Object.keys(this._delta).length > 0;
	}

	/**
	 * Gets the state delta.
	 *
	 * @returns The state delta
	 */
	getDelta(): Record<string, unknown> {
		return { ...this._delta };
	}

	/**
	 * Commits the delta to the value and clears the delta.
	 */
	commitDelta(): void {
		for (const [key, value] of Object.entries(this._delta)) {
			this._value[key] = value;
		}
		this._delta = {};
	}

	/**
	 * Clears the delta without committing.
	 */
	clearDelta(): void {
		this._delta = {};
	}

	/**
	 * Updates the state with the given values.
	 *
	 * @param values The values to update the state with
	 */
	update(values: Record<string, unknown>): void {
		for (const [key, value] of Object.entries(values)) {
			this.set(key, value);
		}
	}

	/**
	 * Sets an app-level state value.
	 *
	 * @param key The key to set
	 * @param value The value to set
	 */
	setAppValue(key: string, value: unknown): void {
		this.set(State.APP_PREFIX + key, value);
	}

	/**
	 * Gets an app-level state value.
	 *
	 * @param key The key to get
	 * @returns The app-level state value
	 */
	getAppValue(key: string): unknown {
		return this.get(State.APP_PREFIX + key);
	}

	/**
	 * Sets a user-level state value.
	 *
	 * @param key The key to set
	 * @param value The value to set
	 */
	setUserValue(key: string, value: unknown): void {
		this.set(State.USER_PREFIX + key, value);
	}

	/**
	 * Gets a user-level state value.
	 *
	 * @param key The key to get
	 * @returns The user-level state value
	 */
	getUserValue(key: string): unknown {
		return this.get(State.USER_PREFIX + key);
	}

	/**
	 * Sets a temporary state value.
	 *
	 * @param key The key to set
	 * @param value The value to set
	 */
	setTempValue(key: string, value: unknown): void {
		this.set(State.TEMP_PREFIX + key, value);
	}

	/**
	 * Gets a temporary state value.
	 *
	 * @param key The key to get
	 * @returns The temporary state value
	 */
	getTempValue(key: string): unknown {
		return this.get(State.TEMP_PREFIX + key);
	}

	/**
	 * Returns the state as a plain object.
	 *
	 * @returns The state as a plain object
	 */
	toObject(): Record<string, unknown> {
		const result: Record<string, unknown> = {};

		// Add all values
		for (const [key, value] of Object.entries(this._value)) {
			result[key] = value;
		}

		// Override with deltas
		for (const [key, value] of Object.entries(this._delta)) {
			result[key] = value;
		}

		return result;
	}
}
