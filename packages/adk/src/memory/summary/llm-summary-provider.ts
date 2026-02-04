import type { Session } from "../../sessions/session";
import type {
	Entity,
	MemoryContent,
	MemorySummaryProvider,
	TopicSegment,
} from "../types";

/**
 * Configuration for LlmSummaryProvider
 */
export interface LlmSummaryProviderConfig {
	/**
	 * The model to use for summarization.
	 * Can be a model name string or a BaseLlm instance.
	 */
	model: string;

	/**
	 * Custom prompt for summarization (optional).
	 * If not provided, uses a sensible default.
	 */
	prompt?: string;

	/**
	 * What to extract from the session.
	 */
	extract?: {
		/** Extract a summary (default: true) */
		summary?: boolean;
		/** Extract topic segments (default: true) */
		segments?: boolean;
		/** Extract named entities (default: true) */
		entities?: boolean;
		/** Extract key facts (default: true) */
		keyFacts?: boolean;
	};

	/**
	 * Optional: API key for the model provider.
	 * If not provided, will use environment variables.
	 */
	apiKey?: string;

	/**
	 * Optional: Base URL for the model provider.
	 */
	baseUrl?: string;
}

/**
 * Default extraction settings
 */
const DEFAULT_EXTRACT = {
	summary: true,
	segments: true,
	entities: true,
	keyFacts: true,
};

/**
 * Default prompt for summarization
 */
const DEFAULT_PROMPT = `You are a memory summarization assistant. Analyze the following conversation and extract structured information.

Conversation:
{{conversation}}

Please provide the following in JSON format:
{
  "summary": "A concise 1-2 sentence summary of the conversation",
  "segments": [
    {
      "topic": "Short topic label",
      "summary": "Detailed summary of this topic",
      "relevance": "high" | "medium" | "low"
    }
  ],
  "entities": [
    {
      "name": "Entity name",
      "type": "person" | "place" | "organization" | "thing" | "other",
      "relation": "Relationship to user (optional)"
    }
  ],
  "keyFacts": ["Important fact 1", "Important fact 2"]
}

Only include segments, entities, and keyFacts that are actually present in the conversation.
Respond with valid JSON only.`;

/**
 * LLM-based summary provider that uses an AI model to summarize sessions
 * into structured memory content.
 *
 * @example
 * ```typescript
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({ vectorStore }),
 *   summaryProvider: new LlmSummaryProvider({
 *     model: 'gpt-4o-mini',
 *     extract: { summary: true, segments: true, entities: true },
 *   }),
 *   embeddingProvider: new OpenAIEmbeddingProvider(),
 * });
 * ```
 */
export class LlmSummaryProvider implements MemorySummaryProvider {
	private readonly model: string;
	private readonly prompt: string;
	private readonly extract: Required<
		NonNullable<LlmSummaryProviderConfig["extract"]>
	>;
	private readonly apiKey?: string;
	private readonly baseUrl?: string;

	constructor(config: LlmSummaryProviderConfig) {
		this.model = config.model;
		this.prompt = config.prompt ?? DEFAULT_PROMPT;
		this.extract = { ...DEFAULT_EXTRACT, ...config.extract };
		this.apiKey = config.apiKey;
		this.baseUrl = config.baseUrl;
	}

	/**
	 * Summarize a session using an LLM.
	 */
	async summarize(session: Session): Promise<MemoryContent> {
		// Extract conversation text
		const conversationText = this.extractConversationText(session);

		if (!conversationText.trim()) {
			return { rawText: "" };
		}

		// Build the prompt
		const fullPrompt = this.prompt.replace(
			"{{conversation}}",
			conversationText,
		);

		// Call the LLM
		const response = await this.callLlm(fullPrompt);

		// Parse the response
		return this.parseResponse(response, conversationText);
	}

	/**
	 * Extract conversation text from session events.
	 */
	private extractConversationText(session: Session): string {
		const parts: string[] = [];

		for (const event of session.events) {
			if (event.text) {
				parts.push(`${event.author}: ${event.text}`);
				continue;
			}

			if (event.content?.parts && Array.isArray(event.content.parts)) {
				const textParts = event.content.parts
					.filter(
						(part: { text?: string }) =>
							typeof part.text === "string" && part.text.length > 0,
					)
					.map((part: { text: string }) => part.text);

				if (textParts.length > 0) {
					parts.push(`${event.author}: ${textParts.join(" ")}`);
				}
			}
		}

		return parts.join("\n");
	}

	/**
	 * Call the LLM to generate the summary.
	 * This is a simplified implementation - in production you'd use the LLM registry.
	 */
	private async callLlm(prompt: string): Promise<string> {
		// Determine provider from model name
		const isOpenAI =
			this.model.startsWith("gpt-") || this.model.includes("openai");
		const isAnthropic = this.model.startsWith("claude-");
		const isGemini =
			this.model.startsWith("gemini-") || this.model.includes("google");

		if (isOpenAI) {
			return this.callOpenAI(prompt);
		}
		if (isAnthropic) {
			return this.callAnthropic(prompt);
		}
		if (isGemini) {
			return this.callGemini(prompt);
		}

		// Default to OpenAI-compatible API
		return this.callOpenAI(prompt);
	}

	private async callOpenAI(prompt: string): Promise<string> {
		const apiKey = this.apiKey ?? process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error(
				"OpenAI API key not provided. Set OPENAI_API_KEY or pass apiKey in config.",
			);
		}

		const baseUrl = this.baseUrl ?? "https://api.openai.com/v1";

		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: this.model,
				messages: [{ role: "user", content: prompt }],
				temperature: 0.3,
				response_format: { type: "json_object" },
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI API error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		return data.choices?.[0]?.message?.content ?? "";
	}

	private async callAnthropic(prompt: string): Promise<string> {
		const apiKey = this.apiKey ?? process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error(
				"Anthropic API key not provided. Set ANTHROPIC_API_KEY or pass apiKey in config.",
			);
		}

		const baseUrl = this.baseUrl ?? "https://api.anthropic.com/v1";

		const response = await fetch(`${baseUrl}/messages`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: this.model,
				max_tokens: 2048,
				messages: [{ role: "user", content: prompt }],
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Anthropic API error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		return data.content?.[0]?.text ?? "";
	}

	private async callGemini(prompt: string): Promise<string> {
		const apiKey = this.apiKey ?? process.env.GOOGLE_API_KEY;
		if (!apiKey) {
			throw new Error(
				"Google API key not provided. Set GOOGLE_API_KEY or pass apiKey in config.",
			);
		}

		const baseUrl =
			this.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";

		const response = await fetch(
			`${baseUrl}/models/${this.model}:generateContent?key=${apiKey}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: {
						temperature: 0.3,
						responseMimeType: "application/json",
					},
				}),
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Google API error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
	}

	/**
	 * Parse the LLM response into MemoryContent.
	 */
	private parseResponse(response: string, fallbackText: string): MemoryContent {
		try {
			// Try to parse JSON from the response
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				return { rawText: fallbackText, summary: response.trim() };
			}

			const parsed = JSON.parse(jsonMatch[0]);
			const content: MemoryContent = {};

			if (this.extract.summary && parsed.summary) {
				content.summary = parsed.summary;
			}

			if (this.extract.segments && Array.isArray(parsed.segments)) {
				content.segments = parsed.segments.filter(
					(s: TopicSegment) => s.topic && s.summary,
				);
			}

			if (this.extract.entities && Array.isArray(parsed.entities)) {
				content.entities = parsed.entities.filter(
					(e: Entity) => e.name && e.type,
				);
			}

			if (this.extract.keyFacts && Array.isArray(parsed.keyFacts)) {
				content.keyFacts = parsed.keyFacts.filter(
					(f: unknown) => typeof f === "string" && f.length > 0,
				);
			}

			// Always include raw text as fallback
			content.rawText = fallbackText;

			return content;
		} catch {
			// If parsing fails, return raw text with the response as summary
			return {
				rawText: fallbackText,
				summary: response.trim(),
			};
		}
	}
}
