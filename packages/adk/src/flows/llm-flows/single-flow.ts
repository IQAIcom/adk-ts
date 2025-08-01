import { requestProcessor as authRequestProcessor } from "../../auth/auth-preprocessor";
import { BaseLlmFlow } from "./base-llm-flow";
import { requestProcessor as basicRequestProcessor } from "./basic";
import {
	requestProcessor as codeExecutionRequestProcessor,
	responseProcessor as codeExecutionResponseProcessor,
} from "./code-execution";
import { requestProcessor as contentRequestProcessor } from "./contents";
import { requestProcessor as identityRequestProcessor } from "./identity";
import { requestProcessor as instructionsRequestProcessor } from "./instructions";
import {
	requestProcessor as nlPlanningRequestProcessor,
	responseProcessor as nlPlanningResponseProcessor,
} from "./nl-planning";
import { responseProcessor as outputSchemaResponseProcessor } from "./output-schema";
import { sharedMemoryRequestProcessor } from "./shared-memory";

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
			basicRequestProcessor,
			authRequestProcessor, // Phase 3: Auth preprocessor
			instructionsRequestProcessor,
			identityRequestProcessor,
			contentRequestProcessor,
			sharedMemoryRequestProcessor,
			// Some implementations of NL Planning mark planning contents as thoughts
			// in the post processor. Since these need to be unmarked, NL Planning
			// should be after contents.
			nlPlanningRequestProcessor, // Phase 5: NL Planning
			// Code execution should be after the contents as it mutates the contents
			// to optimize data files.
			codeExecutionRequestProcessor, // Phase 5: Code Execution (placeholder)
		);

		// Add response processors
		this.responseProcessors.push(
			nlPlanningResponseProcessor, // Phase 5: NL Planning
			outputSchemaResponseProcessor, // Phase 6: Output Schema validation and parsing - validates response against agent's output schema
			codeExecutionResponseProcessor, // Phase 7: Code Execution (placeholder)
		);

		this.logger.debug("SingleFlow initialized with processors");
	}
}
