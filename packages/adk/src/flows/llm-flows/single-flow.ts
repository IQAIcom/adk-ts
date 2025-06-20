import { Logger } from "@adk/helpers/logger";
import { BaseLlmFlow } from "./base-llm-flow";

const logger = new Logger({ name: "SingleFlow" });

/**
 * SingleFlow is the LLM flow that handles tool calls.
 *
 * A single flow only considers an agent itself and tools.
 * No sub-agents are allowed for single flow.
 *
 * This matches the Python implementation's SingleFlow class.
 */
export class SingleFlow extends BaseLlmFlow {
	/**
	 * Constructor for SingleFlow
	 */
	constructor() {
		super();

		// Add request processors (matching Python implementation)
		this.requestProcessors.push(
			// basic.request_processor,
			// auth_preprocessor.request_processor,
			// instructions.request_processor,
			// identity.request_processor,
			// contents.request_processor,
			// _nl_planning.request_processor,
			// _code_execution.request_processor,
		);

		// Add response processors
		this.responseProcessors.push(
			// _nl_planning.response_processor,
			// _code_execution.response_processor,
		);

		logger.debug("SingleFlow initialized with processors");
	}
}
