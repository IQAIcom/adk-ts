import type { LiveRequestQueue } from "./live-request-queue";

/**
 * Manages streaming tool related resources during invocation.
 */
export class ActiveStreamingTool {
	/**
	 * The active task of this streaming tool.
	 */
	task?: Promise<any>;

	/**
	 * The active (input) streams of this streaming tool.
	 */
	stream?: LiveRequestQueue;

	constructor(options?: {
		task?: Promise<any>;
		stream?: LiveRequestQueue;
	}) {
		this.task = options?.task;
		this.stream = options?.stream;
	}
}
