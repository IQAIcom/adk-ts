/**
 * Agent Development Kit (ADK) for TypeScript
 * A framework for building AI agents with multi-provider LLM support
 */

// Agent Exports - Main entry point for most users
export { Agent } from "./agents/llm-agent";
export type { AgentConfig } from "./agents/llm-agent";

// Specialized Agents
export { SequentialAgent } from "./agents/sequential-agent";
export { ParallelAgent } from "./agents/parallel-agent";
export { LoopAgent } from "./agents/loop-agent";
export { LangGraphAgent } from "./agents/lang-graph-agent";

// Base Classes - For extending the framework
export { BaseAgent } from "./agents/base-agent";
export { BaseTool } from "./tools/base/base-tool";
export { BaseLLM } from "./models/base-llm";
export { BaseLLMConnection } from "./models/base-llm-connection";
export type { ToolConfig } from "./tools/base/base-tool";

// Core LLM Infrastructure
export { LLMRegistry } from "./models/llm-registry";

// LLM Providers - Direct access to specific providers
export { OpenAILLM } from "./models/openai-llm";
export { AnthropicLLM } from "./models/anthropic-llm";
export { GoogleLLM } from "./models/google-llm";

// LLM Connections
export { OpenAILLMConnection } from "./models/openai-llm-connection";
export { AnthropicLLMConnection } from "./models/anthropic-llm-connection";

// Initialize providers - Automatically registers all LLMs
import "./models/registry";

// Ready-to-use Tools
export { GoogleSearch } from "./tools/common/google-search";
// Export additional common tools when available

// Request/Response Models
export {
	LLMRequest,
	Message,
	MessageRole,
	MessageContent,
} from "./models/llm-request";
export {
	LLMResponse,
	FunctionCall,
	ToolCall,
} from "./models/llm-response";
export {
	FunctionDeclaration,
	JSONSchema,
} from "./models/function-declaration";

// Context Models - For advanced usage
export { InvocationContext } from "./agents/invocation-context";
export { ToolContext } from "./tools/tool-context";
export { RunConfig, StreamingMode } from "./agents/run-config";

// Auth System - For API authentication
export { AuthConfig } from "./auth/auth-config";
export {
	AuthCredential,
	AuthCredentialType,
	ApiKeyCredential,
	BasicAuthCredential,
	BearerTokenCredential,
	OAuth2Credential,
} from "./auth/auth-credential";
export {
	AuthScheme,
	AuthSchemeType,
	ApiKeyScheme,
	HttpScheme,
	OAuth2Scheme,
	OpenIdConnectScheme,
} from "./auth/auth-schemes";
export { AuthHandler } from "./auth/auth-handler";

// Memory System - For persistent conversations
export {
	Session,
	ListSessionOptions,
} from "./sessions/session";
export { SessionState } from "./sessions/state";

export {
	BaseMemoryService,
	MemoryResult,
	SearchMemoryResponse,
	SearchMemoryOptions,
} from "./memory/base-memory-service";

export { InMemoryMemoryService } from "./memory/in-memory-memory-service";
export { PersistentMemoryService } from "./memory/persistent-memory-service";

// Namespaced exports for cleaner imports
export * as Agents from "./agents";
export * as Tools from "./tools";
export * as Models from "./models";
export * as Memory from "./memory";
export * as Sessions from "./sessions";

// Version
export const version = "0.1.0";
