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
			if (!isValidStateName(varName)) {
				return match[0]; // Return original if not a valid state name
			}

			const sessionState = invocationContext.session.state;
			if (varName in sessionState) {
				return String(sessionState[varName]);
			}
			if (optional) {
				return "";
			}
			throw new Error(`Context variable not found: \`${varName}\`.`);
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
