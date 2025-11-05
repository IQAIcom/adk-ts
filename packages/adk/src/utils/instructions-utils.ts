import type { ReadonlyContext } from "../agents/readonly-context";

/**
 * Injects session state values into an instruction template.
 *
 * This method is intended to be used in InstructionProvider based instruction
 * and global_instruction which are called with readonly_context.
 *
 * Example:
 * ```typescript
 * import { injectSessionState } from './utils/instructions-utils';
 *
 * async function buildInstruction(readonlyContext: ReadonlyContext): Promise<string> {
 *   return await injectSessionState(
 *     'You can inject a state variable like {var_name} or an artifact ' +
 *     '{artifact.file_name} into the instruction template.',
 *     readonlyContext
 *   );
 * }
 *
 * const agent = new LlmAgent({
 *   model: "gemini-2.0-flash",
 *   name: "agent",
 *   instruction: buildInstruction,
 * });
 * ```
 *
 * @param template The instruction template with {variable} placeholders
 * @param readonlyContext The read-only context containing session data
 * @returns The instruction template with values populated
 */
export async function injectSessionState(
	template: string,
	readonlyContext: ReadonlyContext,
): Promise<string> {
	const invocationContext = (readonlyContext as any)._invocationContext;

	/**
	 * Async replacement function for regex matches
	 */
	async function asyncReplace(
		pattern: RegExp,
		replaceAsyncFn: (match: RegExpMatchArray) => Promise<string>,
		string: string,
	): Promise<string> {
		const result: string[] = [];
		let lastEnd = 0;

		const matches = Array.from(string.matchAll(pattern));
		for (const match of matches) {
			result.push(string.slice(lastEnd, match.index));
			const replacement = await replaceAsyncFn(match);
			result.push(replacement);
			lastEnd = (match.index || 0) + match[0].length;
		}
		result.push(string.slice(lastEnd));
		return result.join("");
	}

	/**
	 * Replaces a single template variable match
	 */
	async function replaceMatch(match: RegExpMatchArray): Promise<string> {
		let varName = match[0].replace(/[{}]/g, "").trim();
		let optional = false;

		// Check if variable is optional (ends with ?)
		if (varName.endsWith("?")) {
			optional = true;
			varName = varName.slice(0, -1);
		}

		// Handle artifact variables
		if (varName.startsWith("artifact.")) {
			varName = varName.replace("artifact.", "");

			if (!invocationContext.artifactService) {
				throw new Error("Artifact service is not initialized.");
			}

			try {
				const artifact = await invocationContext.artifactService.loadArtifact({
					appName: invocationContext.session.appName,
					userId: invocationContext.session.userId,
					sessionId: invocationContext.session.id,
					filename: varName,
				});

				if (!artifact) {
					throw new Error(`Artifact ${varName} not found.`);
				}

				return String(artifact);
			} catch (error) {
				if (optional) {
					return "";
				}
				throw error;
			}
		} else {
			// Handle session state variables
			// Check if this is a nested property access (e.g., basket.fruits[0].name)
			const isNestedAccess = varName.includes(".") || varName.includes("[");

			// Extract root property name for validation
			const rootProperty = isNestedAccess
				? varName.split(/[.[]/)[0] // Get the part before first . or [
				: varName;

			// Validate the root property name
			if (!isValidStateName(rootProperty)) {
				return match[0]; // Return original if not a valid state name
			}

			const sessionState = invocationContext.session.state;

			try {
				const value = isNestedAccess
					? getNestedValue(sessionState, varName)
					: sessionState[varName];

				if (value === undefined) {
					if (optional) {
						return "";
					}
					throw new Error(`Context variable not found: \`${varName}\`.`);
				}

				return formatValue(value);
			} catch (error) {
				if (optional) {
					return "";
				}
				throw error;
			}
		}
	}

	// Replace all template variables using the pattern {variable_name}
	return await asyncReplace(/{[^{}]*}/g, replaceMatch, template);
}

/**
 * Checks if the variable name is a valid state name.
 *
 * Valid state is either:
 *   - Valid identifier
 *   - <Valid prefix>:<Valid identifier>
 * All others will be returned as-is.
 *
 * @param varName The variable name to check
 * @returns True if the variable name is a valid state name, false otherwise
 */
function isValidStateName(varName: string): boolean {
	const parts = varName.split(":");

	if (parts.length === 1) {
		return isValidIdentifier(varName);
	}

	if (parts.length === 2) {
		// Check for valid prefixes (matching Python State class constants)
		const validPrefixes = ["app:", "user:", "temp:"];
		const prefix = `${parts[0]}:`;

		if (validPrefixes.includes(prefix)) {
			return isValidIdentifier(parts[1]);
		}
	}

	return false;
}

/**
 * Checks if a string is a valid JavaScript identifier
 */
function isValidIdentifier(name: string): boolean {
	// JavaScript identifier regex: starts with letter, $, or _, followed by letters, digits, $, or _
	const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
	return identifierRegex.test(name);
}

/**
 * Gets a nested value from an object using a path string.
 * Supports both dot notation (obj.prop) and bracket notation (obj[0], obj['prop'])
 *
 * @param obj The object to extract value from
 * @param path The path string (e.g., "basket.fruits[0].name")
 * @returns The value at the specified path
 */
function getNestedValue(obj: any, path: string): any {
	// Split the path into parts, handling both dot notation and bracket notation
	// We need to handle quoted strings that may contain dots
	const parts: string[] = [];
	let current = "";
	let inBrackets = false;
	let quote = "";

	for (let i = 0; i < path.length; i++) {
		const char = path[i];

		if (char === "[" && !quote) {
			// Starting bracket notation
			if (current) {
				parts.push(current);
				current = "";
			}
			inBrackets = true;
		} else if (char === "]" && inBrackets && !quote) {
			// Ending bracket notation
			if (current) {
				parts.push(current);
				current = "";
			}
			inBrackets = false;
		} else if ((char === '"' || char === "'") && inBrackets) {
			// Toggle quote state
			if (quote === char) {
				quote = "";
			} else if (!quote) {
				quote = char;
			} else {
				current += char;
			}
		} else if (char === "." && !inBrackets && !quote) {
			// Dot separator (only when not in brackets or quotes)
			if (current) {
				parts.push(current);
				current = "";
			}
		} else {
			// Regular character
			current += char;
		}
	}

	// Add last part
	if (current) {
		parts.push(current);
	}

	// Navigate through the object
	let result: any = obj;
	for (const part of parts) {
		if (result === null || result === undefined) {
			return undefined;
		}
		result = result[part];
	}

	return result;
}

/**
 * Formats a value for injection into a template.
 * - Primitive values are converted to strings
 * - Objects and arrays are serialized to JSON with indentation
 *
 * @param value The value to format
 * @returns The formatted string representation
 */
function formatValue(value: any): string {
	if (value === null) {
		return "null";
	}

	if (value === undefined) {
		return "undefined";
	}

	// Check if value is an object or array
	if (typeof value === "object") {
		return JSON.stringify(value, null, 2);
	}

	// For primitives (string, number, boolean), convert to string
	return String(value);
}
