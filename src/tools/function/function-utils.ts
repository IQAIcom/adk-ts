import type {
	FunctionDeclaration,
	JSONSchema,
} from "../../models/request/FunctionDeclaration";

/**
 * Options for building a function declaration
 */
export interface BuildFunctionDeclarationOptions {
	name?: string;
	description?: string;
	ignoreParams?: string[];
}

/**
 * Builds a function declaration from a TypeScript function.
 *
 * This utility analyzes the function signature and JSDoc comments to create
 * a FunctionDeclaration object that can be used with LLMs.
 *
 * @param func The function to analyze
 * @param options Options for customizing the declaration
 * @returns A FunctionDeclaration representing the function
 */
export function buildFunctionDeclaration(
	func: (...args: any[]) => any,
	options: BuildFunctionDeclarationOptions = {},
): FunctionDeclaration {
	const funcStr = func.toString();
	const name = options.name || func.name;

	// Extract description from JSDoc if available
	let description = options.description || "";
	if (!description) {
		const docMatch = funcStr.match(/\/\*\*([\s\S]*?)\*\//);
		if (docMatch) {
			description = docMatch[1]
				.replace(/\n\s*\*/g, "\n") // Remove * at line starts
				.replace(/^\s+|\s+$/g, "") // Trim whitespace
				.trim();
		}
	}

	// Create the parameter schema
	const parameters = extractParametersSchema(func, options.ignoreParams || []);

	return {
		name,
		description,
		parameters,
	};
}

/**
 * Extracts JSON Schema for function parameters.
 */
function extractParametersSchema(
	func: (...args: any[]) => any,
	ignoreParams: string[] = [],
): JSONSchema {
	const funcStr = func.toString();

	// Extract parameter list from function string
	const paramMatch = funcStr.match(/\(([^)]*)\)/);
	if (!paramMatch) return { type: "object", properties: {} };

	const paramList = paramMatch[1]
		.split(",")
		.map((param) => param.trim())
		.filter((param) => param !== "");

	if (
		paramList.length === 0 ||
		(paramList.length === 1 && paramList[0] === "")
	) {
		return { type: "object", properties: {} };
	}

	// Extract JSDoc param annotations if available
	const jsDocParams = extractJSDocParams(funcStr);

	// Build properties object
	const properties: Record<string, JSONSchema> = {};
	const required: string[] = [];

	for (const param of paramList) {
		let paramName = param;
		let isOptional = false;
		let paramType = "string";

		// Check for named parameters with type annotations or default values
		// Format could be: name: type = defaultValue
		const paramParts = param.split(/\s*[:=]\s*/);

		if (paramParts.length > 0) {
			// Extract param name (handle destructuring etc)
			const nameMatch = paramParts[0].match(/^(\w+)(?:\s*:.*)?$/);
			if (nameMatch) {
				paramName = nameMatch[1];
			}

			// Check if parameter has a default value (optional)
			isOptional = param.includes("=");

			// Try to detect the parameter type
			if (param.includes(":")) {
				const typeMatch = param.match(/:\s*(\w+)/);
				if (typeMatch) {
					paramType = mapTypescriptTypeToJsonSchemaType(typeMatch[1]);
				}
			}
		}

		// Skip ignored parameters
		if (ignoreParams.includes(paramName)) {
			continue;
		}

		// If not optional, add to required array
		if (!isOptional) {
			required.push(paramName);
		}

		// Create property schema
		properties[paramName] = {
			type: paramType as any,
		};

		// Add description from JSDoc if available
		if (jsDocParams[paramName]) {
			properties[paramName].description = jsDocParams[paramName];
		}
	}

	const schema: JSONSchema = {
		type: "object",
		properties,
	};

	if (required.length > 0) {
		schema.required = required;
	}

	return schema;
}

/**
 * Maps TypeScript type names to JSON Schema types
 */
function mapTypescriptTypeToJsonSchemaType(tsType: string): string {
	const lowerType = tsType.toLowerCase();

	switch (lowerType) {
		case "string":
			return "string";
		case "number":
		case "bigint":
			return "number";
		case "boolean":
		case "bool":
			return "boolean";
		case "array":
			return "array";
		case "object":
			return "object";
		case "null":
		case "undefined":
			return "null";
		// Default to string for unknown types
		default:
			return "string";
	}
}

/**
 * Extracts parameter descriptions from JSDoc comments.
 */
function extractJSDocParams(funcStr: string): Record<string, string> {
	const paramDocs: Record<string, string> = {};

	// Find all @param annotations in JSDoc
	const paramRegex =
		/@param\s+(?:{[^}]+}\s+)?(\w+)\s+(.+?)(?=\n\s*@|\n\s*\*\/|$)/gs;

	let match: RegExpExecArray | null;
	while (true) {
		match = paramRegex.exec(funcStr);
		if (!match) {
			break;
		}
		const paramName = match[1];
		const description = match[2].trim();
		paramDocs[paramName] = description;
	}

	return paramDocs;
}
