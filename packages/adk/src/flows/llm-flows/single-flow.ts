import { requestProcessor as authRequestProcessor } from "../../auth/auth-preprocessor";
import { BaseLlmFlow } from "./base-llm-flow";
import { requestProcessor as basicRequestProcessor } from "./basic";
import {
	requestProcessor as codeExecutionRequestProcessor,
	responseProcessor as codeExecutionResponseProcessor,
} from "./code-execution";
import { requestProcessor as contentRequestProcessor } from "./contents";
import { requestProcessor as contextCacheRequestProcessor } from "./context-cache-processor";
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
 */
export class SingleFlow extends BaseLlmFlow {
	constructor() {
		super();

		// Add request processors
		this.requestProcessors.push(
			basicRequestProcessor,
			authRequestProcessor, // Phase 3: Auth preprocessor
			instructionsRequestProcessor,
			identityRequestProcessor,
			contentRequestProcessor,
			sharedMemoryRequestProcessor,
			// Add context cache processor early so caching info is available
			contextCacheRequestProcessor,
			// Some implementations of NL Planning mark planning contents as thoughts
			// in the post processor. Since these need to be unmarked, NL Planning
			// should be after contents.
			nlPlanningRequestProcessor, // Phase 5: NL Planning
			// Code execution should be after the contents as it mutates the contents
			// to optimize data files.
			codeExecutionRequestProcessor, // Phase 5: Code Execution
		);

		// Add response processors
		this.responseProcessors.push(
			nlPlanningResponseProcessor, // Phase 5: NL Planning
			outputSchemaResponseProcessor, // Phase 6: Output Schema validation
			codeExecutionResponseProcessor, // Phase 7: Code Execution
		);

		this.logger.debug("SingleFlow initialized with processors");
	}
}
