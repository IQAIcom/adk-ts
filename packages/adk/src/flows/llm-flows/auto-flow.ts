import { requestProcessor as agentTransferRequestProcessor } from "./agent-transfer";
import { SingleFlow } from "./single-flow";

/**
 * AutoFlow is SingleFlow with agent transfer capability.
 *
 * Agent transfer is allowed in the following directions:
 * 1. from parent to sub-agent;
 * 2. from sub-agent to parent;
 * 3. from sub-agent to its peer agents;
 *
 * For peer-agent transfers, it's only enabled when all below conditions are met:
 * - The parent agent is also of AutoFlow;
 * - `disallow_transfer_to_peer` option of this agent is False (default).
 *
 * This matches the Python implementation's AutoFlow class.
 */
export class AutoFlow extends SingleFlow {
	/**
	 * Constructor for AutoFlow
	 */
	constructor() {
		super();

		// Add agent transfer request processor
		this.requestProcessors.push(agentTransferRequestProcessor);

		this.logger.debug("AutoFlow initialized with agent transfer capability");
	}
}
