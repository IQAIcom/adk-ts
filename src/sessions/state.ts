/**
 * Represents the state of a session
 */
export class SessionState {
	private state: Map<string, any>;
	private dirty: Set<string>;

	constructor() {
		this.state = new Map<string, any>();
		this.dirty = new Set<string>();
	}

	/**
	 * Sets a value in the state
	 * @param key The key to set
	 * @param value The value to set
	 */
	set(key: string, value: any): void {
		this.state.set(key, value);
		this.dirty.add(key);
	}

	/**
	 * Gets a value from the state
	 * @param key The key to get
	 * @returns The value or undefined if not present
	 */
	get<T>(key: string): T | undefined {
		return this.state.get(key) as T | undefined;
	}

	/**
	 * Checks if the state has a key
	 * @param key The key to check
	 * @returns Whether the key exists
	 */
	has(key: string): boolean {
		return this.state.has(key);
	}

	/**
	 * Deletes a key from the state
	 * @param key The key to delete
	 * @returns Whether the key was deleted
	 */
	delete(key: string): boolean {
		if (this.state.has(key)) {
			this.state.delete(key);
			this.dirty.add(key);
			return true;
		}
		return false;
	}

	/**
	 * Checks if state has changed since last save
	 * @returns Whether the state has been modified
	 */
	hasDelta(): boolean {
		return this.dirty.size > 0;
	}

	/**
	 * Clears the dirty state
	 */
	clearDelta(): void {
		this.dirty.clear();
	}

	/**
	 * Converts the state to a plain object
	 */
	toObject(): Record<string, any> {
		const result: Record<string, any> = {};
		this.state.forEach((value, key) => {
			result[key] = value;
		});
		return result;
	}

	/**
	 * Creates a state from a plain object
	 * @param obj The object to load
	 */
	static fromObject(obj: Record<string, any>): SessionState {
		const state = new SessionState();
		Object.entries(obj).forEach(([key, value]) => {
			state.state.set(key, value);
		});
		return state;
	}
}

export enum SessionLifecycleState {
	ACTIVE = "active",
	ENDED = "ended",
	EXPIRED = "expired",
}
