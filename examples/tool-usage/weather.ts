import { BaseTool } from "../../src";
import type { ToolContext } from "../../src/models/context/ToolContext";
import type { FunctionDeclaration } from "../../src/models/request/FunctionDeclaration";

/**
 * Weather Tool (Mock Implementation)
 */
export class WeatherTool extends BaseTool {
	constructor() {
		super({
			name: "weather",
			description: "Get the current weather for a location",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					location: {
						type: "string",
						description: "The city or location to get weather for",
					},
				},
				required: ["location"],
			},
		};
	}

	async runAsync(
		args: {
			location: string;
		},
		_context: ToolContext,
	): Promise<any> {
		console.log(`Getting weather for: ${args.location}`);

		// Mock implementation - would be replaced with an actual API call
		const conditions = ["sunny", "cloudy", "rainy", "snowy"];
		const randomTemp = Math.floor(Math.random() * 35) + 0; // 0-35°C
		const randomCondition =
			conditions[Math.floor(Math.random() * conditions.length)];

		return {
			location: args.location,
			temperature: `${randomTemp}°C`,
			condition: randomCondition,
			humidity: `${Math.floor(Math.random() * 100)}%`,
			updated: new Date().toISOString(),
		};
	}
}
