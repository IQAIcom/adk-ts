import { spawn } from "node:child_process";
import { BaseLlm, LlmRequest } from "@adk/models";
import { BaseTool, ToolContext } from "@adk/tools";
import { BasePlugin } from "./base-plugin";

export interface FilterConfig {
	/** Size threshold in characters to trigger filtering */
	sizeThreshold?: number;
	/** Key/field count threshold to trigger filtering */
	keyThreshold?: number;
	/** Target size after filtering */
	targetSize?: number;
	/** Maximum filtering iterations */
	maxIterations?: number;
	/** Maximum depth for schema extraction */
	maxSchemaDepth?: number;
	/** Enable debug logging */
	debug?: boolean;
}

export interface ToolOutputFilterPluginOptions {
	name?: string;
	/** LLM model used to generate JQ filters (should be fast/cheap like Haiku) */
	filterModel: BaseLlm;
	/** Only filter outputs from these tools (undefined = filter all) */
	enabledTools?: string[];
	/** Skip filtering for these tools */
	disabledTools?: string[];
	/** Configuration for filtering behavior */
	config?: FilterConfig;
}

interface SchemaExtractionResult {
	schema: any;
	preview: string;
	size: number;
	keyCount: number;
}

const DEFAULT_CONFIG: Required<FilterConfig> = {
	sizeThreshold: 8000,
	keyThreshold: 50,
	targetSize: 4000,
	maxIterations: 3,
	maxSchemaDepth: 4,
	debug: false,
};

export class ToolOutputFilterPlugin extends BasePlugin {
	private filterModel: BaseLlm;
	private enabledTools?: Set<string>;
	private disabledTools: Set<string>;
	private config: Required<FilterConfig>;

	constructor(options: ToolOutputFilterPluginOptions) {
		super(options.name ?? "tool_output_filter_plugin");

		this.filterModel = options.filterModel;
		this.enabledTools = options.enabledTools
			? new Set(options.enabledTools)
			: undefined;
		this.disabledTools = new Set(options.disabledTools ?? []);
		this.config = { ...DEFAULT_CONFIG, ...options.config };
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		result: Record<string, any>;
	}): Promise<Record<string, any> | undefined> {
		const { tool, toolArgs, result } = params;

		// Check if tool should be filtered
		if (!this.shouldFilterTool(tool.name)) {
			return undefined;
		}

		// Extract schema and check if filtering is needed
		const analysis = this.analyzeResponse(result);
		if (!this.needsFiltering(analysis)) {
			this.log("Response within threshold, skipping filter");
			return undefined;
		}

		this.log(
			`Response exceeds threshold (${analysis.size} chars, ${analysis.keyCount} keys)`,
		);

		// Perform iterative filtering
		const filterResult = await this.iterativeFilter({
			toolName: tool.name,
			toolArgs,
			initialData: result,
			initialAnalysis: analysis,
		});

		if (!filterResult.success) {
			this.log("Filtering unsuccessful, returning original response");
			return undefined;
		}

		this.log(
			`Successfully filtered: ${filterResult.reduction.toFixed(1)}% reduction ` +
				`(${analysis.size} → ${filterResult.finalSize} chars) ` +
				`in ${filterResult.iterations} iteration(s)`,
		);

		// Return filtered result with metadata
		return {
			_mcp_filtered: true,
			_original_size: analysis.size,
			_filtered_size: filterResult.finalSize,
			_reduction_percent: filterResult.reduction,
			_jq_filters: filterResult.filters,
			_iterations: filterResult.iterations,
            data: filterResult.data,
		};
	}

	private shouldFilterTool(toolName: string): boolean {
		// Check disabled list first
		if (this.disabledTools.has(toolName)) {
			return false;
		}

		// If enabled list exists, tool must be in it
		if (this.enabledTools) {
			return this.enabledTools.has(toolName);
		}

		// No restrictions, filter all tools
		return true;
	}

	private analyzeResponse(result: any): SchemaExtractionResult {
		const resultStr = JSON.stringify(result);
		return {
			schema: this.extractSchema(result, 0),
			preview: resultStr.substring(0, 1000),
			size: resultStr.length,
			keyCount: this.countKeys(result, 0),
		};
	}

	private needsFiltering(analysis: SchemaExtractionResult): boolean {
		return (
			analysis.size >= this.config.sizeThreshold ||
			analysis.keyCount >= this.config.keyThreshold
		);
	}

	private countKeys(obj: unknown, depth: number, maxDepth = 10): number {
		if (depth > maxDepth) return 0;

		if (Array.isArray(obj)) {
			let count = obj.length;
			for (const item of obj) {
				count += this.countKeys(item, depth + 1, maxDepth);
			}
			return count;
		}

		if (obj && typeof obj === "object") {
			let count = Object.keys(obj).length;
			for (const value of Object.values(obj)) {
				count += this.countKeys(value, depth + 1, maxDepth);
			}
			return count;
		}

		return 0;
	}

	private extractSchema(obj: unknown, depth: number): any {
		if (depth > this.config.maxSchemaDepth) {
			return "...";
		}

		if (obj === null) return "null";
		if (typeof obj === "boolean") return "boolean";
		if (typeof obj === "number") {
			return Number.isInteger(obj) ? "integer" : "number";
		}
		if (typeof obj === "string") {
			return obj.length > 100 ? `string(${obj.length} chars)` : "string";
		}

		if (Array.isArray(obj)) {
			if (obj.length === 0) return "array[]";
			return {
				_array_length: obj.length,
				_item_schema: this.extractSchema(obj[0], depth + 1),
			};
		}

		if (typeof obj === "object") {
			const schema: Record<string, any> = {};
			for (const [key, value] of Object.entries(obj)) {
				schema[key] = this.extractSchema(value, depth + 1);
			}
			return schema;
		}

		return typeof obj;
	}

	private async iterativeFilter(params: {
		toolName: string;
		toolArgs: Record<string, any>;
		initialData: any;
		initialAnalysis: SchemaExtractionResult;
	}): Promise<{
		success: boolean;
		data?: any;
		finalSize?: number;
		reduction?: number;
		iterations?: number;
		filters?: string[];
	}> {
		const { toolName, toolArgs, initialData, initialAnalysis } = params;

		let currentData = initialData;
		let currentSize = initialAnalysis.size;
		let currentSchema = initialAnalysis.schema;
		const allFilters: string[] = [];

		for (
			let iteration = 1;
			iteration <= this.config.maxIterations;
			iteration++
		) {
			// Check if target reached
			if (currentSize <= this.config.targetSize) {
				this.log(
					`Target size reached (${currentSize} <= ${this.config.targetSize})`,
				);
				break;
			}

			this.log(
				`Iteration ${iteration}/${this.config.maxIterations}, size: ${currentSize} chars`,
			);

			// Generate JQ filter
			const jqFilter = await this.generateJqFilter({
				toolName,
				toolArgs,
				schema: currentSchema,
				responsePreview: JSON.stringify(currentData).substring(0, 500),
				iteration,
				previousFilter: allFilters[allFilters.length - 1],
				previousSize: currentSize,
			});

			if (!jqFilter) {
				this.log(`Failed to generate JQ filter on iteration ${iteration}`);
				break;
			}

			this.log(`Generated JQ filter: ${jqFilter}`);
			allFilters.push(jqFilter);

			// Apply filter
			const filteredData = await this.applyJqFilter(jqFilter, currentData);

			if (!filteredData) {
				this.log(`JQ filter failed on iteration ${iteration}`);
				break;
			}

			const newSize = JSON.stringify(filteredData).length;

			// Check for progress
			if (newSize >= currentSize) {
				this.log(
					`Filter didn't reduce size (${currentSize} → ${newSize}), stopping`,
				);
				break;
			}

			this.log(`Reduced: ${currentSize} → ${newSize} chars`);
			currentData = filteredData;
			currentSize = newSize;
			currentSchema = this.extractSchema(currentData, 0);
		}

		// Check if we achieved any filtering
		if (allFilters.length === 0 || currentData === initialData) {
			return { success: false };
		}

		const reduction =
			((initialAnalysis.size - currentSize) / initialAnalysis.size) * 100;

		return {
			success: true,
			data: currentData,
			finalSize: currentSize,
			reduction,
			iterations: allFilters.length,
			filters: allFilters,
		};
	}

	private async generateJqFilter(params: {
		toolName: string;
		toolArgs: Record<string, any>;
		schema: any;
		responsePreview: string;
		iteration: number;
		previousFilter?: string;
		previousSize?: number;
	}): Promise<string | null> {
		const {
			toolName,
			toolArgs,
			schema,
			responsePreview,
			iteration,
			previousFilter,
			previousSize,
		} = params;

		const isFirstIteration = iteration === 1;

		const systemPrompt = isFirstIteration
			? this.getInitialSystemPrompt()
			: this.getIterativeSystemPrompt();

		const userPrompt = isFirstIteration
			? this.buildInitialPrompt(toolName, toolArgs, schema, responsePreview)
			: this.buildIterativePrompt(
					toolName,
					toolArgs,
					schema,
					responsePreview,
					previousFilter!,
					previousSize!,
				);

		try {
			const llmRequest = new LlmRequest({
				contents: [
					{
						role: "user" as const,
						parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
					},
				],
			});

			let responseText = "";
			for await (const response of this.filterModel.generateContentAsync(
				llmRequest,
			)) {
				if (response.text) {
					responseText += response.text;
				}
			}

			return this.extractJqCommand(responseText);
		} catch (error) {
			this.log(`Filter model error: ${error}`);
			return null;
		}
	}

	private getInitialSystemPrompt(): string {
		return `You are a JQ filter generator. Given a JSON schema and query context,
output ONLY a valid jq filter expression that extracts the most relevant data.

Rules:
- Output ONLY the jq filter, no explanation, no markdown, no backticks
- Preserve data needed to answer the likely user intent
- For arrays, prefer selecting relevant fields over limiting count (use: [.[] | {field1, field2}])
- Keep identifiers, names, key metrics, timestamps
- Remove verbose/redundant nested data, long descriptions, metadata
- If unsure, use a conservative filter that keeps more data
- Filter must be valid jq syntax`;
	}

	private getIterativeSystemPrompt(): string {
		return `You are a JQ filter generator. The previous filter didn't reduce the data enough.
Generate a MORE AGGRESSIVE filter that reduces output size further.

Rules:
- Output ONLY the jq filter, no explanation, no markdown, no backticks
- Be more aggressive: limit array sizes, select fewer fields, remove nested objects
- Use array slicing: .[0:10] or limit to first N items
- Select only the most essential fields for the query intent
- It's okay to lose some data - the goal is to fit within size limits
- Filter must be valid jq syntax`;
	}

	private buildInitialPrompt(
		toolName: string,
		toolArgs: Record<string, any>,
		schema: any,
		responsePreview: string,
	): string {
		return `Tool: ${toolName}
Tool Input: ${JSON.stringify(toolArgs, null, 2)}

Response Schema:
${JSON.stringify(schema, null, 2)}

Response Preview (first 500 chars):
${responsePreview.substring(0, 500)}

Generate a jq filter to extract the most relevant data for this query.`;
	}

	private buildIterativePrompt(
		toolName: string,
		toolArgs: Record<string, any>,
		schema: any,
		_responsePreview: string,
		previousFilter: string,
		previousSize: number,
	): string {
		const sizeReduction = previousSize - this.config.targetSize;

		return `Tool: ${toolName}
Tool Input: ${JSON.stringify(toolArgs, null, 2)}

Response Schema:
${JSON.stringify(schema, null, 2)}

Previous filter: ${previousFilter}
Previous output size: ${previousSize} chars
Target size: ${this.config.targetSize} chars
Need to reduce by: ${sizeReduction} more chars

Generate a MORE AGGRESSIVE jq filter. Consider:
- Limiting arrays to fewer items (e.g., .[0:5] or first(10))
- Selecting fewer fields
- Removing nested objects entirely
- Truncating or omitting string fields`;
	}

	private extractJqCommand(agentResponse: any): string | null {
		let responseText = "";

		// Handle different response formats
		if (typeof agentResponse === "string") {
			responseText = agentResponse;
		} else if (agentResponse?.text) {
			responseText = agentResponse.text;
		} else if (agentResponse?.parts?.[0]?.text) {
			responseText = agentResponse.parts[0].text;
		} else if (agentResponse?.content?.parts?.[0]?.text) {
			responseText = agentResponse.content.parts[0].text;
		} else if (agentResponse?.message?.content?.[0]?.text) {
			responseText = agentResponse.message.content[0].text;
		}

		if (!responseText) return null;

		// Clean up markdown code blocks
		responseText = responseText.trim();

		if (responseText.startsWith("```")) {
			const lines = responseText.split("\n");
			if (lines.length > 1) {
				// Remove first line (```jq or similar)
				let contentLines = lines.slice(1);
				// Remove closing fence if present
				if (
					contentLines.length > 0 &&
					contentLines[contentLines.length - 1].trim() === "```"
				) {
					contentLines = contentLines.slice(0, -1);
				}
				responseText = contentLines.join("\n").trim();
			}
		}

		// Remove surrounding quotes if present
		if (responseText.startsWith('"') && responseText.endsWith('"')) {
			responseText = responseText.slice(1, -1);
		}

		return responseText || null;
	}

	private async applyJqFilter(
		jqFilter: string,
		data: any,
	): Promise<any | null> {
		// Security check: reject dangerous patterns
		const dangerousPatterns = [
			"system(",
			"$ENV",
			"env.",
			"input_filename",
			"$__",
		];

		for (const pattern of dangerousPatterns) {
			if (jqFilter.toLowerCase().includes(pattern.toLowerCase())) {
				this.log(`Dangerous JQ filter rejected: ${jqFilter}`);
				return null;
			}
		}

		return new Promise((resolve) => {
			const input = JSON.stringify(data);
			// Use spawn to avoid command injection vulnerabilities.
			const jqProcess = spawn("jq", ["-c", jqFilter], {
				timeout: 10000,
			});

			let stdoutData = "";
			let stderrData = "";

			jqProcess.stdout.on("data", (chunk) => {
				stdoutData += chunk.toString();
			});
			jqProcess.stderr.on("data", (chunk) => {
				stderrData += chunk.toString();
			});

			jqProcess.on("error", (err) => {
				this.log(`JQ process spawn error: ${err.message}`);
				resolve(null);
			});

			jqProcess.on("close", (code) => {
				if (code !== 0) {
					this.log(`JQ execution failed with code ${code}: ${stderrData}`);
					resolve(null);
					return;
				}

				try {
					const result = JSON.parse(stdoutData.trim());
					resolve(result);
				} catch (parseError: any) {
					this.log(`JQ output JSON parse error: ${parseError.message}`);
					resolve(null);
				}
			});

			jqProcess.stdin.write(input);
			jqProcess.stdin.end();
		});
	}

	private log(message: string): void {
		if (this.config.debug) {
			console.error(`[ToolOutputFilterPlugin] ${message}`);
		}
	}

	async close(): Promise<void> {
		return;
	}
}
