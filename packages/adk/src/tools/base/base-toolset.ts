import type { BaseTool } from "./base-tool";
import type { ReadonlyContext } from "../../agents/readonly-context";

/**
 * Protocol for a predicate that defines the interface to decide whether a
 * tool should be exposed to LLM. Toolset implementer could consider whether to
 * accept such instance in the toolset's constructor and apply the predicate in
 * getTools method.
 */
export interface ToolPredicate {
	/**
	 * Decide whether the passed-in tool should be exposed to LLM based on the
	 * current context. True if the tool is usable by the LLM.
	 *
	 * It's used to filter tools in the toolset.
	 *
	 * @param tool The tool to evaluate
	 * @param readonlyContext Context used to filter tools
	 * @returns True if the tool should be exposed to the LLM
	 */

	// biome-ignore lint/style/useShorthandFunctionType: <explanation>
	(tool: BaseTool, readonlyContext?: ReadonlyContext): boolean;
}

/**
 * Base class for toolset.
 *
 * A toolset is a collection of tools that can be used by an agent.
 */
export abstract class BaseToolset {
	/**
	 * Return all tools in the toolset based on the provided context.
	 *
	 * @param readonlyContext Context used to filter tools available to the agent.
	 *   If undefined, all tools in the toolset are returned.
	 * @returns A list of tools available under the specified context.
	 */
	abstract getTools(readonlyContext?: ReadonlyContext): Promise<BaseTool[]>;

	/**
	 * Performs cleanup and releases resources held by the toolset.
	 *
	 * NOTE: This method is invoked, for example, at the end of an agent server's
	 * lifecycle or when the toolset is no longer needed. Implementations
	 * should ensure that any open connections, files, or other managed
	 * resources are properly released to prevent leaks.
	 */
	abstract close(): Promise<void>;
}
