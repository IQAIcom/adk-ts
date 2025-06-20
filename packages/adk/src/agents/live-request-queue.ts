import type { Blob, Content } from "@google/genai";

/**
 * Request send to live agents.
 */
export class LiveRequest {
	/**
	 * If set, send the content to the model in turn-by-turn mode.
	 */
	content?: Content;

	/**
	 * If set, send the blob to the model in realtime mode.
	 */
	blob?: Blob;

	/**
	 * If set, close the queue.
	 */
	close = false;

	constructor(options?: {
		content?: Content;
		blob?: Blob;
		close?: boolean;
	}) {
		this.content = options?.content;
		this.blob = options?.blob;
		this.close = options?.close || false;
	}
}

/**
 * Queue used to send LiveRequest in a live(bidirectional streaming) way.
 */
export class LiveRequestQueue {
	private _queue: LiveRequest[] = [];
	private _waiters: Array<(value: LiveRequest) => void> = [];
	private _closed = false;

	/**
	 * Close the queue.
	 */
	close(): void {
		this.send(new LiveRequest({ close: true }));
	}

	/**
	 * Send content to the queue.
	 */
	sendContent(content: Content): void {
		this.send(new LiveRequest({ content }));
	}

	/**
	 * Send realtime blob to the queue.
	 */
	sendRealtime(blob: Blob): void {
		this.send(new LiveRequest({ blob }));
	}

	/**
	 * Send a LiveRequest to the queue.
	 */
	send(req: LiveRequest): void {
		if (this._closed) {
			throw new Error("Queue is closed");
		}

		if (req.close) {
			this._closed = true;
		}

		if (this._waiters.length > 0) {
			const waiter = this._waiters.shift()!;
			waiter(req);
		} else {
			this._queue.push(req);
		}
	}

	/**
	 * Get the next LiveRequest from the queue.
	 */
	async get(): Promise<LiveRequest> {
		if (this._queue.length > 0) {
			return this._queue.shift()!;
		}

		return new Promise<LiveRequest>((resolve) => {
			this._waiters.push(resolve);
		});
	}
}
