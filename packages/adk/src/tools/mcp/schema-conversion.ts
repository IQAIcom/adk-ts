import { Type } from "@google/genai";
import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import type {
	FunctionDeclaration,
	JSONSchema,
} from "../../models/function-declaration";
import type { BaseTool } from "../base/base-tool";

/**
 * Converts an ADK-style BaseTool to an MCP tool format
 * Similar to Python's adk_to_mcp_tool_type function
 */
export function adkToMcpToolType(tool: BaseTool): McpTool {
	const declaration = tool.getDeclaration();
	const params = declarationToJsonSchema(declaration);

	return {
		name: tool.name,
		description: tool.description || "",
		inputSchema: {
			type: "object",
			properties: params,
		},
	} as McpTool;
}

/**
 * Converts a FunctionDeclaration's parameters to a JSON Schema
 */
export function declarationToJsonSchema(
	declaration: FunctionDeclaration,
): Record<string, any> {
	if (!declaration.parameters) {
		return {};
	}

	if (declaration.parameters.properties) {
		return declaration.parameters.properties;
	}

	// Otherwise return the whole parameters object
	return declaration.parameters;
}

/**
 * Converts MCP JSONSchema to ADK's FunctionDeclaration format
 * Similar to handling in McpToolAdapter's getDeclaration
 */
export function jsonSchemaToDeclaration(
	name: string,
	description: string,
	schema: Record<string, any> | undefined,
): FunctionDeclaration {
	let parameters: JSONSchema;

	if (schema) {
		if (
			typeof schema === "object" &&
			"type" in schema &&
			typeof schema.type === "string"
		) {
			parameters = schema as JSONSchema;
		} else {
			parameters = {
				type: Type.OBJECT,
				properties: schema as Record<string, any>,
			};
		}
	} else {
		parameters = {
			type: Type.OBJECT,
			properties: {},
		};
	}

	return {
		name,
		description,
		parameters,
	};
}

/**
 * Normalizes a JSON Schema to ensure it's properly formatted
 * Handles edge cases and ensures consistency
 */
export function normalizeJsonSchema(schema: Record<string, any>): JSONSchema {
	if (!schema) {
		return { type: Type.OBJECT, properties: {} };
	}

	const normalizedSchema = { ...schema };

	if (!normalizedSchema.type) {
		normalizedSchema.type = determineSchemaType(normalizedSchema);
	}

	// Handle different schema types
	switch (normalizedSchema.type) {
		case "object":
			return normalizeObjectSchema(normalizedSchema);
		case "array":
			return normalizeArraySchema(normalizedSchema);
		case "string":
			return normalizeStringSchema(normalizedSchema);
		case "number":
		case "integer":
			return normalizeNumberSchema(normalizedSchema);
		case "boolean":
			return { type: Type.BOOLEAN };
		case "null":
			return { type: Type.NULL };
		default:
			return normalizedSchema as JSONSchema;
	}
}

/**
 * Attempts to determine the schema type based on schema structure
 */
function determineSchemaType(schema: Record<string, any>): Type {
	if (
		schema.properties ||
		schema.required ||
		schema.additionalProperties !== undefined
	) {
		return Type.OBJECT;
	}

	if (schema.items) {
		return Type.ARRAY;
	}

	if (schema.enum !== undefined) {
		if (schema.enum.length === 0) return Type.STRING;
		const firstItem = schema.enum[0];
		if (typeof firstItem === "string") return Type.STRING;
		if (typeof firstItem === "number") return Type.NUMBER;
		if (typeof firstItem === "boolean") return Type.BOOLEAN;
		return Type.STRING;
	}

	if (
		schema.minLength !== undefined ||
		schema.maxLength !== undefined ||
		schema.pattern
	) {
		return Type.STRING;
	}

	if (
		schema.minimum !== undefined ||
		schema.maximum !== undefined ||
		schema.exclusiveMinimum !== undefined ||
		schema.exclusiveMaximum !== undefined
	) {
		return schema.multipleOf === undefined || schema.multipleOf % 1 === 0
			? Type.INTEGER
			: Type.NUMBER;
	}

	return Type.OBJECT;
}

/**
 * Normalizes an object schema
 */
function normalizeObjectSchema(schema: Record<string, any>): JSONSchema {
	const normalizedSchema: JSONSchema = {
		type: Type.OBJECT,
		properties: {},
	};

	if (schema.properties) {
		normalizedSchema.properties = {};

		for (const [key, value] of Object.entries(schema.properties)) {
			normalizedSchema.properties[key] = normalizeJsonSchema(
				value as Record<string, any>,
			);
		}
	}

	if (schema.required) normalizedSchema.required = schema.required;
	if (schema.title) normalizedSchema.title = schema.title;
	if (schema.description) normalizedSchema.description = schema.description;

	return normalizedSchema;
}

/**
 * Normalizes an array schema
 */
function normalizeArraySchema(schema: Record<string, any>): JSONSchema {
	const normalizedSchema: JSONSchema = {
		type: Type.ARRAY,
	};

	if (schema.items) {
		normalizedSchema.items = normalizeJsonSchema(
			schema.items as Record<string, any>,
		);
	}

	if (schema.minItems !== undefined)
		normalizedSchema.minItems = schema.minItems;
	if (schema.maxItems !== undefined)
		normalizedSchema.maxItems = schema.maxItems;
	if (schema.title) normalizedSchema.title = schema.title;
	if (schema.description) normalizedSchema.description = schema.description;

	return normalizedSchema;
}

/**
 * Normalizes a string schema
 */
function normalizeStringSchema(schema: Record<string, any>): JSONSchema {
	const normalizedSchema: JSONSchema = {
		type: Type.STRING,
	};

	if (schema.minLength !== undefined)
		normalizedSchema.minLength = schema.minLength;
	if (schema.maxLength !== undefined)
		normalizedSchema.maxLength = schema.maxLength;
	if (schema.pattern) normalizedSchema.pattern = schema.pattern;
	if (schema.format) normalizedSchema.format = schema.format;
	if (schema.enum) normalizedSchema.enum = schema.enum;
	if (schema.title) normalizedSchema.title = schema.title;
	if (schema.description) normalizedSchema.description = schema.description;

	return normalizedSchema;
}

/**
 * Normalizes a number/integer schema
 */
function normalizeNumberSchema(schema: Record<string, any>): JSONSchema {
	const normalizedSchema: JSONSchema = {
		type: schema.type as Type,
	};

	if (schema.minimum !== undefined) normalizedSchema.minimum = schema.minimum;
	if (schema.maximum !== undefined) normalizedSchema.maximum = schema.maximum;
	if (schema.enum) normalizedSchema.enum = schema.enum;
	if (schema.title) normalizedSchema.title = schema.title;
	if (schema.description) normalizedSchema.description = schema.description;

	return normalizedSchema;
}

/**
 * Converts MCP tool inputSchema to parameters format expected by BaseTool
 */
export function mcpSchemaToParameters(mcpTool: McpTool): JSONSchema {
	let schema: Record<string, any> | undefined;

	if (mcpTool.inputSchema) {
		schema = mcpTool.inputSchema;
	} else if (mcpTool.parameters) {
		schema = mcpTool.parameters as Record<string, any>;
	}

	if (!schema) {
		return {
			type: Type.OBJECT,
			properties: {},
		};
	}

	return normalizeJsonSchema(schema);
}
