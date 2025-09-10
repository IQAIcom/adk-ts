/**
 * Agent Development Kit (ADK) for TypeScript
 * A framework for building AI agents with multi-provider LLM support
 */

// Re-export all exports from each module
export * from "./agents";
// Explicit re-exports to ensure types are preserved in bundled declarations
export { AgentBuilder, type BuiltAgent } from "./agents/agent-builder";
export * from "./tools";
export * from "./models";
export * from "./memory";
export * from "./auth";
export * from "./sessions";
export * from "./artifacts";
export * from "./flows";
export * from "./utils";
export * from "./events";
export * from "./code-executors";

export * from "./planners";
export * from "./evaluation";

// Initialize providers - Automatically registers all LLMs
import "./models/registry";

// Re-export runners.ts
export * from "./runners";

// Re-export telemetry.ts
export * from "./telemetry";

// Re-export version.ts
export * from "./version";

// Maintain explicit namespaced exports for cleaner imports
export * as Agents from "./agents";
export * as Tools from "./tools";
export * as Models from "./models";
export * as Memory from "./memory";
export * as Sessions from "./sessions";
export * as Flows from "./flows";
export * as Events from "./events";
export * as Evaluation from "./evaluation";
