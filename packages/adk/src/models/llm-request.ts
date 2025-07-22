import type { BaseTool } from "@adk/tools";
import type {
	Content,
	GenerateContentConfig,
	LiveConnectConfig,
} from "@google/genai";

/**
 * LLM request class that allows passing in tools, output schema and system
 * instructions to the model.
 *
 * Attributes:
 *   model: The model name.
 *   contents: The contents to send to the model.
 *   config: Additional config for the generate content request.
 *   toolsDict: The tools dictionary.
 */
export class LlmRequest {
	/**
	 * The model name.
	 */
	model?: string;

	/**
	 * The contents to send to the model.
	 */
	contents: Content[];

	/**
	 * Additional config for the generate content request.
	 * Tools in generate_content_config should not be set.
	 */
	config?: GenerateContentConfig;

	/**
	 * Live connect config for the request.
	 */
	liveConnectConfig: LiveConnectConfig;

	/**
	 * The tools dictionary.
	 */
	toolsDict: Record<string, BaseTool>;

	constructor(data?: {
		model?: string;
		contents?: Content[];
		config?: GenerateContentConfig;
		liveConnectConfig?: LiveConnectConfig;
		toolsDict?: Record<string, BaseTool>;
	}) {
		this.model = data?.model;
		this.contents = data?.contents ?? [];
		this.config = data?.config;
		this.liveConnectConfig =
			data?.liveConnectConfig ?? ({} as LiveConnectConfig);
		this.toolsDict = data?.toolsDict ?? {};
	}

	/**
	 * Appends instructions to the system instruction.
	 * @param instructions The instructions to append.
	 */
	appendInstructions(instructions: string[]): void {
		if (!this.config) this.config = {};
		if (this.config.systemInstruction) {
			this.config.systemInstruction += `\n\n${instructions.join("\n\n")}`;
		} else {
			this.config.systemInstruction = instructions.join("\n\n");
		}
	}

	/**
	 * Appends tools to the request.
	 * @param tools The tools to append.
	 */
	appendTools(tools: BaseTool[]): void {
		if (!tools?.length) return;
		const declarations: any[] = [];
		for (const tool of tools) {
			const declaration = tool.getDeclaration?.();
			if (declaration) {
				declarations.push(declaration);
				this.toolsDict[tool.name] = tool;
			}
		}
		if (declarations.length) {
			if (!this.config) this.config = {};
			if (!this.config.tools) this.config.tools = [];
			this.config.tools.push({ functionDeclarations: declarations });
		}
	}

	/**
	 * Sets the output schema for the request.
	 * @param baseModel The base model to set as the output schema.
	 */
	setOutputSchema(baseModel: any): void {
		if (!this.config) this.config = {};
		this.config.responseSchema = baseModel;
		this.config.responseMimeType = "application/json";
	}

	/**
	 * Extracts the system instruction as plain text from Content or string.
	 * System instructions can be either string or Content type.
	 * @returns The system instruction as a string, or undefined if not set.
	 */
	getSystemInstructionText(): string | undefined {
		if (!this.config?.systemInstruction) {
			return undefined;
		}

		const systemInstruction = this.config.systemInstruction;

		// If it's already a string, return it
		if (typeof systemInstruction === "string") {
			return systemInstruction;
		}

		// Handle Content type with parts
		if (
			systemInstruction &&
			typeof systemInstruction === "object" &&
			"parts" in systemInstruction
		) {
			const content = systemInstruction as Content;
			if (content.parts) {
				return content.parts
					.map((part) => part.text || "")
					.filter(Boolean)
					.join("");
			}
		}

		// Fallback to string conversion for any other type
		return String(systemInstruction || "");
	}

	/**
	 * Extracts text content from a Content object.
	 * Used for extracting text from message contents.
	 * @param content The Content object to extract text from.
	 * @returns The extracted text as a string.
	 */
	static extractTextFromContent(content: any): string {
		// If it's already a string, return it
		if (typeof content === "string") {
			return content;
		}

		// If it's an array, assume it's already processed content parts
		if (Array.isArray(content)) {
			return content
				.map((part) => part.text || "")
				.filter(Boolean)
				.join("");
		}

		// Handle Content type with parts
		if (content?.parts) {
			return content.parts
				.map((part: any) => part.text || "")
				.filter(Boolean)
				.join("");
		}

		// Fallback to string conversion
		return String(content || "");
	}
}
