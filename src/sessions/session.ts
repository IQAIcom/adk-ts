// Session module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the session functionality from the Python SDK

import { Event } from "../events/event";
import type { EventActions } from "../events/event_actions";
import type { Content } from "../models/base_llm";

/**
 * Interface for the raw event data parsed from JSON.
 */
interface RawEventData {
  id: string;
  invocationId?: string;
  author: string;
  branch?: string;
  content?: Content;
  actions?: EventActions;
  timestamp?: number;
  partial?: boolean;
  longRunningToolIds?: string[];
}

/**
 * Represents a series of interactions between a user and agents.
 */
export class Session {
  /**
   * The unique identifier of the session.
   */
  id: string;

  /**
   * The name of the app.
   */
  appName: string;

  /**
   * The id of the user.
   */
  userId: string;

  /**
   * The state of the session.
   */
  state: Record<string, unknown>;

  /**
   * The events of the session, e.g., user input, model response, function call/response, etc.
   */
  events: Event[];

  /**
   * The last update time of the session (Unix timestamp in milliseconds).
   */
  lastUpdateTime: number;

  /**
   * Creates a new Session.
   *
   * @param data The session data
   */
  constructor(data: {
    id: string;
    appName: string;
    userId: string;
    state?: Record<string, unknown>;
    events?: Event[];
    lastUpdateTime?: number;
  }) {
    this.id = data.id;
    this.appName = data.appName;
    this.userId = data.userId;
    this.state = data.state || {};
    this.events = data.events || [];
    this.lastUpdateTime = data.lastUpdateTime || Date.now();
  }

  /**
   * Adds an event to the session.
   *
   * @param event The event to add
   * @returns The added event
   */
  addEvent(event: Event): Event {
    this.events.push(event);
    this.lastUpdateTime = Date.now();
    return event;
  }

  /**
   * Gets all the content from events in the session.
   *
   * @returns The content from events in the session
   */
  getContents(): Content[] {
    const contents: Content[] = [];

    for (const event of this.events) {
      const content = event.getContent();
      if (content) {
        contents.push(content);
      }
    }

    return contents;
  }

  /**
   * Gets the state value for the given key.
   *
   * @param key The state key
   * @param defaultValue The default value to return if the key is not found
   * @returns The state value or the default value if not found
   */
  getStateValue(key: string, defaultValue: unknown = undefined): unknown {
    return key in this.state ? this.state[key] : defaultValue;
  }

  /**
   * Sets the state value for the given key.
   *
   * @param key The state key
   * @param value The state value
   */
  setStateValue(key: string, value: unknown): void {
    this.state[key] = value;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Deletes the state value for the given key.
   *
   * @param key The state key
   * @returns True if the key was found and deleted, false otherwise
   */
  deleteStateValue(key: string): boolean {
    if (key in this.state) {
      delete this.state[key];
      this.lastUpdateTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Checks if the state has a value for the given key.
   *
   * @param key The state key
   * @returns True if the key exists in the state, false otherwise
   */
  hasStateValue(key: string): boolean {
    return key in this.state;
  }

  /**
   * Updates the session state with the given values.
   *
   * @param values The values to update the state with
   */
  updateState(values: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(values)) {
      this.state[key] = value;
    }
    this.lastUpdateTime = Date.now();
  }

  /**
   * Gets the session as a JSON object.
   *
   * @returns The session as a JSON object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      appName: this.appName,
      userId: this.userId,
      state: this.state,
      events: this.events,
      lastUpdateTime: this.lastUpdateTime,
    };
  }

  /**
   * Creates a session from a JSON object.
   *
   * @param json The JSON object
   * @returns A new session instance
   */
  static fromJSON(json: Record<string, unknown>): Session {
    // Convert raw event objects to Event instances
    const eventsArray = (json.events as RawEventData[]) || [];
    const events = eventsArray.map((eventData: RawEventData) => {
      return new Event({
        id: eventData.id,
        invocationId: eventData.invocationId,
        author: eventData.author,
        branch: eventData.branch,
        content: eventData.content,
        actions: eventData.actions,
        timestamp: eventData.timestamp,
        partial: eventData.partial,
        longRunningToolIds: eventData.longRunningToolIds
          ? new Set(eventData.longRunningToolIds)
          : undefined,
      });
    });

    return new Session({
      id: json.id as string,
      appName: json.appName as string,
      userId: json.userId as string,
      state: (json.state as Record<string, unknown>) || {},
      events: events,
      lastUpdateTime: json.lastUpdateTime as number | undefined,
    });
  }
}
