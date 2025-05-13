// Active streaming tool module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the active_streaming_tool.py from the Python SDK

import { LiveRequestQueue } from "./LiveRequestQueue";

/**
 * Manages streaming tool related resources during invocation.
 */
export class ActiveStreamingTool {
  /**
   * The active task of this streaming tool.
   * In TypeScript, we'll use Promise instead of Python's asyncio.Task
   */
  task?: Promise<unknown>;

  /**
   * The active (input) streams of this streaming tool.
   */
  stream?: LiveRequestQueue;

  /**
   * Creates a new ActiveStreamingTool.
   *
   * @param options Configuration options
   */
  constructor(
    options: {
      task?: Promise<unknown>;
      stream?: LiveRequestQueue;
    } = {},
  ) {
    this.task = options.task;
    this.stream = options.stream;
  }
}
