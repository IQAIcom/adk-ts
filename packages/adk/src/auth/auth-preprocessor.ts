import type { InvocationContext } from "../agents/invocation-context";
import { ReadonlyContext } from "../agents/readonly-context";
import type { Event } from "../events/event";
import type { LlmRequest } from "../models/llm-request";
import { BaseLlmRequestProcessor } from "../flows/llm-flows/base-llm-processor";
import {
	REQUEST_EUC_FUNCTION_CALL_NAME,
	handleFunctionCallsAsync,
} from "../flows/llm-flows/functions";
import { AuthHandler } from "./auth-handler";
import type { AuthToolArguments } from "./auth-tool";
import { EnhancedAuthConfig } from "./auth-tool";

/**
 * Auth LLM request processor that handles authentication information
 * to build the LLM request with credential processing
 */
class AuthLlmRequestProcessor extends BaseLlmRequestProcessor {
	/**
	 * Processes authentication information from session events
	 * and resumes function calls that required authentication
	 */
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const agent = invocationContext.agent;

		// Check if agent is an LLM agent (duck typing check)
		if (!agent || typeof (agent as any).canonicalTools !== "function") {
			return;
		}

		const events = invocationContext.session.events;
		if (!events || events.length === 0) {
			return;
		}

		// Find request EUC function call IDs from user responses
		const requestEucFunctionCallIds = new Set<string>();

		// Look backwards through events for user-authored events
		for (let i = events.length - 1; i >= 0; i--) {
			const event = events[i];

			// Look for first event authored by user
			if (!event.author || event.author !== "user") {
				continue;
			}

			const responses = event.getFunctionResponses();
			if (!responses || responses.length === 0) {
				return;
			}

			for (const functionCallResponse of responses) {
				if (functionCallResponse.name !== REQUEST_EUC_FUNCTION_CALL_NAME) {
					continue;
				}

				// Found the function call response for the system long running request EUC function call
				requestEucFunctionCallIds.add(functionCallResponse.id);

				try {
					// Parse and store auth response
					const authConfig = EnhancedAuthConfig.prototype.constructor(
						JSON.parse(functionCallResponse.response),
					);
					const authHandler = new AuthHandler({
						authConfig: authConfig,
					});

					// Store auth response in session state
					this.parseAndStoreAuthResponse(authHandler, invocationContext);
				} catch (error) {
					console.warn("Failed to parse auth response:", error);
				}
			}
			break;
		}

		if (requestEucFunctionCallIds.size === 0) {
			return;
		}

		// Find the system long running request EUC function call
		for (let i = events.length - 2; i >= 0; i--) {
			const event = events[i];
			const functionCalls = event.getFunctionCalls();
			if (!functionCalls || functionCalls.length === 0) {
				continue;
			}

			const toolsToResume = new Set<string>();

			for (const functionCall of functionCalls) {
				if (!requestEucFunctionCallIds.has(functionCall.id)) {
					continue;
				}

				try {
					const args = JSON.parse(functionCall.args) as AuthToolArguments;
					toolsToResume.add(args.function_call_id);
				} catch (error) {
					console.warn("Failed to parse auth tool arguments:", error);
				}
			}

			if (toolsToResume.size === 0) {
				continue;
			}

			// Found the system long running request EUC function call
			// Look for original function call that requested EUC
			for (let j = i - 1; j >= 0; j--) {
				const originalEvent = events[j];
				const originalFunctionCalls = originalEvent.getFunctionCalls();
				if (!originalFunctionCalls || originalFunctionCalls.length === 0) {
					continue;
				}

				// Check if any function calls match the tools to resume
				const hasMatchingCall = originalFunctionCalls.some((functionCall) =>
					toolsToResume.has(functionCall.id),
				);

				if (hasMatchingCall) {
					// Get canonical tools for the agent
					const readonlyContext = new ReadonlyContext(invocationContext);
					const canonicalTools = await (agent as any).canonicalTools(
						readonlyContext,
					);

					// Create tools map
					const toolsMap = Object.fromEntries(
						canonicalTools.map((tool: any) => [tool.name, tool]),
					);

					// Handle function calls that needed authentication
					const functionResponseEvent = await handleFunctionCallsAsync(
						invocationContext,
						originalEvent,
						toolsMap,
						toolsToResume,
					);

					if (functionResponseEvent) {
						yield functionResponseEvent;
					}
					return;
				}
			}
			return;
		}
	}

	/**
	 * Parses and stores authentication response in session state
	 */
	private parseAndStoreAuthResponse(
		authHandler: AuthHandler,
		invocationContext: InvocationContext,
	): void {
		try {
			// Get credential key for storage
			const credentialKey =
				authHandler.authConfig.context?.credentialKey || `temp:${Date.now()}`;

			// Store the auth credential in session state
			const fullCredentialKey = credentialKey.startsWith("temp:")
				? credentialKey
				: `temp:${credentialKey}`;

			invocationContext.session.state[fullCredentialKey] =
				authHandler.credential;

			// For OAuth2 and OpenID Connect, attempt token exchange if needed
			// This is a simplified version - full OAuth2 exchange would be more complex
			if (
				authHandler.authConfig.authScheme.type === "oauth2" ||
				authHandler.authConfig.authScheme.type === "openIdConnect"
			) {
				// In a full implementation, this would handle token exchange
				// For now, we just store the credential as-is
			}
		} catch (error) {
			console.warn("Failed to store auth response:", error);
		}
	}
}

/**
 * Exported request processor instance for use in flow configurations
 */
export const requestProcessor = new AuthLlmRequestProcessor();
