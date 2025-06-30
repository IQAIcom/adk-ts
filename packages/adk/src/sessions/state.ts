/**
 * A state dict that maintain the current value and the pending-commit delta.
 */
export class State {
	static readonly APP_PREFIX = "app:";
	static readonly USER_PREFIX = "user:";
	static readonly TEMP_PREFIX = "temp:";

	private readonly _value: Record<string, any>;
	private readonly _delta: Record<string, any>;

	/**
	 * Constructor for State
	 *
	 * @param value - The current value of the state dict.
	 * @param delta - The delta change to the current value that hasn't been committed.
	 */
	constructor(value: Record<string, any>, delta: Record<string, any>) {
		this._value = value;
		this._delta = delta;
	}

	/**
	 * Returns the value of the state dict for the given key.
	 */
	get(key: string, defaultValue?: any): any {
		if (!this.has(key)) {
			return defaultValue;
		}
		return this[key];
	}

	/**
	 * Sets the value of the state dict for the given key.
	 */
	set(key: string, value: any): void {
		// TODO: make new change only store in delta, so that this._value is only
		//   updated at the storage commit time.
		this._value[key] = value;
		this._delta[key] = value;
	}

	/**
	 * Whether the state dict contains the given key.
	 */
	has(key: string): boolean {
		return key in this._value || key in this._delta;
	}

	/**
	 * Whether the state has pending delta.
	 */
	hasDelta(): boolean {
		return Object.keys(this._delta).length > 0;
	}

	/**
	 * Updates the state dict with the given delta.
	 */
	update(delta: Record<string, any>): void {
		Object.assign(this._value, delta);
		Object.assign(this._delta, delta);
	}

	/**
	 * Returns the state dict.
	 */
	toDict(): Record<string, any> {
		const result: Record<string, any> = {};
		Object.assign(result, this._value);
		Object.assign(result, this._delta);
		return result;
	}

	/**
	 * Array-like access for getting values.
	 * Returns the value of the state dict for the given key.
	 */
	[key: string]: any;

	/**
	 * Proxy handler for array-like access
	 */
	private static createProxy(state: State): State {
		return new Proxy(state, {
			get(target: State, prop: string | symbol): any {
				if (
					typeof prop === "string" &&
					!prop.startsWith("_") &&
					!(prop in target)
				) {
					// Handle array-like access for getting values
					if (prop in target._delta) {
						return target._delta[prop];
					}
					return target._value[prop];
				}
				return (target as any)[prop];
			},
			set(target: State, prop: string | symbol, value: any): boolean {
				if (
					typeof prop === "string" &&
					!prop.startsWith("_") &&
					!(prop in target)
				) {
					// Handle array-like access for setting values
					target.set(prop, value);
					return true;
				}
				(target as any)[prop] = value;
				return true;
			},
			has(target: State, prop: string | symbol): boolean {
				if (
					typeof prop === "string" &&
					!prop.startsWith("_") &&
					!(prop in target)
				) {
					return target.has(prop);
				}
				return prop in target;
			},
		});
	}

	/**
	 * Factory method to create a proxied State instance
	 */
	static create(value: Record<string, any>, delta: Record<string, any>): State {
		const state = new State(value, delta);
		return State.createProxy(state);
	}
}
