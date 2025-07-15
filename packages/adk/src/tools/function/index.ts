export { FunctionTool } from "./function-tool";
export {
	type BuildFunctionDeclarationOptions,
	buildFunctionDeclaration,
} from "./function-utils";

/**
 * Creates a new FunctionTool that wraps a function.
 * This is a convenience function for creating a new FunctionTool.
 *
 * @param func The function to wrap
 * @param options Optional configuration for the tool
 * @returns A new FunctionTool wrapping the function
 */
export function createFunctionTool(
	func: (...args: any[]) => any,
	options?: {
		name?: string;
		description?: string;
		isLongRunning?: boolean;
		shouldRetryOnFailure?: boolean;
		maxRetryAttempts?: number;
	}
) {
	// Import FunctionTool directly to avoid dynamic imports
	const { FunctionTool } = require("./function-tool");
	return new FunctionTool(func, options);
}
