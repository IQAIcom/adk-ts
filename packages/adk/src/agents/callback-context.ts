import type { Part } from "@google/genai";
import { EventActions } from "../events/event-actions";
import { State } from "../sessions/state";
import type { InvocationContext } from "./invocation-context";
import { ReadonlyContext } from "./readonly-context";

/**
 * The context of various callbacks within an agent run.
 */
export class CallbackContext extends ReadonlyContext {
	/**
	 * TODO: make this public for Agent Development Kit, but private for users.
	 */
	readonly _eventActions: EventActions;

	private readonly _state: State;

	constructor(
		invocationContext: InvocationContext,
		options: {
			eventActions?: EventActions;
		} = {},
	) {
		super(invocationContext);

		this._eventActions = options.eventActions || new EventActions();
		this._state = State.create(
			invocationContext.session.state,
			this._eventActions.stateDelta,
		);
	}

	/**
	 * The delta-aware state of the current session.
	 * For any state change, you can mutate this object directly,
	 * e.g. `ctx.state['foo'] = 'bar'`
	 */
	override get state(): State {
		return this._state;
	}

	/**
	 * Loads an artifact attached to the current session.
	 *
	 * @param filename - The filename of the artifact.
	 * @param version - The version of the artifact. If undefined, the latest version will be returned.
	 * @returns The artifact.
	 */
	async loadArtifact(
		filename: string,
		version?: number,
	): Promise<Part | undefined> {
		if (this._invocationContext.artifactService === undefined) {
			throw new Error("Artifact service is not initialized.");
		}

		return await this._invocationContext.artifactService.loadArtifact({
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
			sessionId: this._invocationContext.session.id,
			filename,
			version,
		});
	}

	/**
	 * Saves an artifact and records it as delta for the current session.
	 *
	 * @param filename - The filename of the artifact.
	 * @param artifact - The artifact to save.
	 * @returns The version of the artifact.
	 */
	async saveArtifact(filename: string, artifact: Part): Promise<number> {
		if (this._invocationContext.artifactService === undefined) {
			throw new Error("Artifact service is not initialized.");
		}

		const version = await this._invocationContext.artifactService.saveArtifact({
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
			sessionId: this._invocationContext.session.id,
			filename,
			artifact,
		});

		this._eventActions.artifactDelta[filename] = version;
		return version;
	}

	/**
	 * Gets the event actions associated with this context.
	 */
	get eventActions(): EventActions {
		return this._eventActions;
	}
}
