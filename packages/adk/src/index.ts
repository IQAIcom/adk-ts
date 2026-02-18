/**
 * Agent Development Kit (ADK) for TypeScript
 * A framework for building AI agents with multi-provider LLM support
 */

// Re-export all exports from each module
export * from "./agents";
// Explicit re-exports to ensure types are preserved in bundled declarations
export { AgentBuilder, type BuiltAgent } from "./agents/agent-builder";
export * from "./artifacts";
export * from "./auth";
export * from "./code-executors";
export * from "./evaluation";
export * from "./events";
export * from "./flows";
export * from "./memory";
export * from "./models";
export * from "./planners";
export * from "./plugins";
export * from "./scheduling";
export * from "./sessions";
export * from "./tools";
export * from "./utils";
export * from "./unified-memory";
export * from "./workflows";

// Initialize providers - Automatically registers all LLMs
import "./models/registry";

// Maintain explicit namespaced exports for cleaner imports
export * as Agents from "./agents";
export * as Evaluation from "./evaluation";
export * as Events from "./events";
export * as Flows from "./flows";
export * as Memory from "./memory";
export * as Models from "./models";
export * as Plugins from "./plugins";
// Re-export runners.ts
export * from "./runners";
export * as Scheduling from "./scheduling";
export * as Sessions from "./sessions";
// Re-export telemetry.ts
export * from "./telemetry";
export * as Workflows from "./workflows";
export * as Tools from "./tools";
export * as UnifiedMemory from "./unified-memory";
// Re-export version.ts
export * from "./version";
