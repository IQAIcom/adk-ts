import { Type } from "@google/genai";
import { Logger } from "../../logger";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Result of getting session details
 */
export interface GetSessionDetailsResult {
	success: boolean;
	sessionId?: string;
	events?: Array<{
		author: string;
		content: string;
		timestamp?: number;
	}>;
	error?: string;
	message?: string;
}

/**
 * Tool that allows an agent to fetch full conversation from a past session.
 *
 * When a memory search returns summaries, this tool enables drilling down
 * into the raw conversation if the user wants more details.
 *
 * @example
 * ```typescript
 * const agent = new AgentBuilder()
 *   .withName('assistant')
 *   .withModel('gpt-4o')
 *   .withTools([
 *     new RecallMemoryTool(),
 *     new GetSessionDetailsTool(), // For drill-down
 *   ])
 *   .withInstruction(
 *     'You can recall memories and get full conversation details if needed.'
 *   )
 *   .build();
 * ```
 */
export class GetSessionDetailsTool extends BaseTool {
	protected logger = new Logger({ name: "GetSessionDetailsTool" });

	constructor() {
		super({
			name: "get_session_details",
			description:
				"Get the full conversation from a past session. Use this when the user " +
				"wants to see the complete conversation from a memory result.",
		});
	}

	/**
	 * Get the function declaration for the tool.
	 */
	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					sessionId: {
						type: Type.STRING,
						description:
							"The session ID from a memory search result to retrieve full details for.",
					},
				},
				required: ["sessionId"],
			},
		};
	}

	/**
	 * Execute the get session details action.
	 */
	async runAsync(
		args: {
			sessionId: string;
		},
		context: ToolContext,
	): Promise<GetSessionDetailsResult> {
		this.logger.debug(
			`Executing get_session_details for session: ${args.sessionId}`,
		);

		const sessionService = context.sessionService;
		if (!sessionService) {
			return {
				success: false,
				error: "Session service not available",
				message: "Session service is not configured for this agent.",
			};
		}

		try {
			// Get the session from the session service
			const session = await sessionService.getSession(
				context.appName,
				context.userId,
				args.sessionId,
			);

			if (!session) {
				return {
					success: false,
					error: "Session not found",
					message:
						`Session ${args.sessionId} was not found or is no longer available. ` +
						"The session may have been deleted or expired.",
				};
			}

			// Extract events from the session
			const events = session.events.map((event) => {
				let content = "";

				// Handle text property directly
				if (event.text) {
					content = event.text;
				}
				// Handle content with parts
				else if (event.content?.parts && Array.isArray(event.content.parts)) {
					const textParts = event.content.parts
						.filter(
							(part: { text?: string }) =>
								typeof part.text === "string" && part.text.length > 0,
						)
						.map((part: { text: string }) => part.text);
					content = textParts.join(" ");
				}

				return {
					author: event.author,
					content,
					timestamp: event.timestamp,
				};
			});

			// Filter out events with empty content
			const filteredEvents = events.filter((e) => e.content.length > 0);

			this.logger.debug(
				`Retrieved ${filteredEvents.length} events from session`,
			);

			return {
				success: true,
				sessionId: args.sessionId,
				events: filteredEvents,
				message: `Retrieved ${filteredEvents.length} messages from the session.`,
			};
		} catch (error) {
			this.logger.error("Error getting session details:", error);
			return {
				success: false,
				error: "Failed to retrieve session",
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
