/**
 * Agent Development Kit (ADK) for TypeScript
 * A framework for building AI agents with multi-provider LLM support
 */

// Re-export all exports from each module
export * from "./agents";
export * from "./artifacts";
export * from "./auth";
export * from "./code-executors";
export * from "./events";
export * from "./flows";
export * from "./memory";
export * from "./models";
export * from "./planners";
export * from "./sessions";
export * from "./tools";
export * from "./utils";

// Initialize providers - Automatically registers all LLMs
import "./models/registry";

// Maintain explicit namespaced exports for cleaner imports
export * as Agents from "./agents";
export * as Events from "./events";
export * as Flows from "./flows";
export * as Memory from "./memory";
export * as Models from "./models";
// Re-export runners.ts
export * from "./runners";
export * as Sessions from "./sessions";
// Re-export telemetry.ts
export * from "./telemetry";
export * as Tools from "./tools";
// Re-export version.ts
export * from "./version";
