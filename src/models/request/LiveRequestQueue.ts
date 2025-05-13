// Live request queue module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the live request queue functionality from the Python SDK

import { Content } from "../base_llm";

/**
 * Represents a blob of data for realtime mode.
 */
export interface Blob {
  mimeType: string;
  data: Uint8Array | string;
}

/**
 * Request sent to live agents.
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
  close: boolean;

  /**
   * Creates a new LiveRequest instance.
   *
   * @param options Configuration options for the request
   */
  constructor(
    options: {
      content?: Content;
      blob?: Blob;
      close?: boolean;
    } = {},
  ) {
    this.content = options.content;
    this.blob = options.blob;
    this.close = options.close || false;
  }
}

/**
 * A promise-based queue implementation for TypeScript.
 */
class AsyncQueue<T> {
  private queue: T[] = [];
  private resolvers: ((value: T) => void)[] = [];
  private closed = false;

  /**
   * Adds an item to the queue. If there are waiting consumers, one of them
   * will be immediately resolved with this item.
   *
   * @param item The item to add to the queue
   */
  put(item: T): void {
    if (this.closed) {
      throw new Error("Cannot put to a closed queue");
    }

    if (this.resolvers.length > 0) {
      // If there are waiting consumers, resolve one with this item
      const resolver = this.resolvers.shift()!;
      resolver(item);
    } else {
      // Otherwise, add the item to the queue
      this.queue.push(item);
    }
  }

  /**
   * Gets an item from the queue. If the queue is empty, returns a promise
   * that will be resolved when an item becomes available.
   *
   * @returns A promise that resolves with the next item from the queue
   */
  async get(): Promise<T> {
    if (this.queue.length > 0) {
      // If there are items in the queue, return one
      return this.queue.shift()!;
    }

    if (this.closed) {
      throw new Error("Queue is closed");
    }

    // Otherwise, return a promise that will be resolved when an item is added
    return new Promise<T>((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  /**
   * Closes the queue, preventing further puts and resolving all pending gets
   * with an error.
   */
  close(): void {
    this.closed = true;

    // Reject all waiting consumers
    for (const resolver of this.resolvers) {
      resolver({
        close: true,
      } as unknown as T);
    }
    this.resolvers = [];
  }
}

/**
 * Queue used to send LiveRequest in a live (bidirectional streaming) way.
 */
export class LiveRequestQueue {
  /**
   * The internal async queue that manages the request queue.
   */
  private queue: AsyncQueue<LiveRequest>;

  /**
   * Creates a new LiveRequestQueue instance.
   */
  constructor() {
    this.queue = new AsyncQueue<LiveRequest>();
  }

  /**
   * Closes the queue, preventing further requests from being sent.
   */
  close(): void {
    this.queue.put(new LiveRequest({ close: true }));
  }

  /**
   * Sends a content message to the queue.
   *
   * @param content The content to send
   */
  sendContent(content: Content): void {
    this.queue.put(new LiveRequest({ content }));
  }

  /**
   * Sends a realtime blob to the queue.
   *
   * @param blob The blob to send
   */
  sendRealtime(blob: Blob): void {
    this.queue.put(new LiveRequest({ blob }));
  }

  /**
   * Sends a request to the queue.
   *
   * @param request The request to send
   */
  send(request: LiveRequest): void {
    this.queue.put(request);
  }

  /**
   * Gets the next request from the queue.
   *
   * @returns A promise that resolves with the next request from the queue
   */
  async get(): Promise<LiveRequest> {
    return this.queue.get();
  }

  /**
   * Creates an async iterator for consuming the queue.
   */
  async *[Symbol.asyncIterator](): AsyncIterator<LiveRequest> {
    try {
      while (true) {
        const request = await this.get();
        if (request.close) {
          break;
        }
        yield request;
      }
    } catch (error) {
      console.error("Error in LiveRequestQueue iterator:", error);
    }
  }
}
