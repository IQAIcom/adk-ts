import type { LlmRequest } from "@adk/models";
import { type Part, Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Content interface for LLM requests
 */
interface Content {
	role: string;
	parts: Part[];
}

/**
 * Function response interface
 */
interface FunctionResponse {
	name: string;
	response: Record<string, any>;
}

/**
 * A tool that loads the artifacts and adds them to the session.
 */
export class LoadArtifactsTool extends BaseTool {
	constructor() {
		super({
			name: "load_artifacts",
			description: "Loads the artifacts and adds them to the session.",
		});
	}

	/**
	 * Get the function declaration for the tool
	 */
	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					artifact_names: {
						type: Type.ARRAY,
						items: {
							type: Type.STRING,
						},
						description: "List of artifact names to load",
					},
				},
				required: [],
			},
		};
	}

	/**
	 * Execute the load artifacts operation
	 */
	async runAsync(
		args: { artifact_names?: string[] },
		context: ToolContext,
	): Promise<{ artifact_names: string[] }> {
		const artifactNames: string[] = args.artifact_names || [];
		return { artifact_names: artifactNames };
	}

	/**
	 * Processes the outgoing LLM request for this tool.
	 */
	async processLlmRequest(
		toolContext: ToolContext,
		llmRequest: LlmRequest,
	): Promise<void> {
		await super.processLlmRequest(toolContext, llmRequest);
		await this.appendArtifactsToLlmRequest(toolContext, llmRequest);
	}

	/**
	 * Appends artifacts information to the LLM request
	 */
	private async appendArtifactsToLlmRequest(
		toolContext: ToolContext,
		llmRequest: LlmRequest,
	): Promise<void> {
		try {
			const artifactNames = await toolContext.listArtifacts();
			if (!artifactNames || artifactNames.length === 0) {
				return;
			}

			// Tell the model about the available artifacts
			const instructions = [
				`You have a list of artifacts:
${JSON.stringify(artifactNames)}

When the user asks questions about any of the artifacts, you should call the
\`load_artifacts\` function to load the artifact. Do not generate any text other
than the function call.
`,
			];

			if (llmRequest.appendInstructions) {
				llmRequest.appendInstructions(instructions);
			}

			// Attach the content of the artifacts if the model requests them
			// This only adds the content to the model request, instead of the session
			if (llmRequest.contents && llmRequest.contents.length > 0) {
				const lastContent = llmRequest.contents[llmRequest.contents.length - 1];
				if (lastContent.parts && lastContent.parts.length > 0) {
					const firstPart = lastContent.parts[0];
					const functionResponse = this.extractFunctionResponse(firstPart);

					if (functionResponse && functionResponse.name === "load_artifacts") {
						const requestedArtifactNames =
							functionResponse.response.artifact_names || [];

						for (const artifactName of requestedArtifactNames) {
							try {
								const artifact = await toolContext.loadArtifact(artifactName);
								if (artifact) {
									llmRequest.contents.push({
										role: "user",
										parts: [
											{
												text: `Artifact ${artifactName} is:`,
											} as Part,
											artifact,
										],
									});
								}
							} catch (error) {
								console.error(
									`Failed to load artifact ${artifactName}:`,
									error,
								);
							}
						}
					}
				}
			}
		} catch (error) {
			console.error("Error appending artifacts to LLM request:", error);
		}
	}
	/**
	 * Extracts function response from a part if it exists
	 */
	private extractFunctionResponse(part: Part): FunctionResponse | null {
		// Check if the part has a function response
		// This is a simplified implementation - you may need to adjust based on your Part interface
		if ("functionResponse" in part && part.functionResponse) {
			return part.functionResponse as FunctionResponse;
		}
		return null;
	}
}
