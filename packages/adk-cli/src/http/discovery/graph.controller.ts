import { Controller, Get, Inject, Logger, Param, Query } from "@nestjs/common";
import {
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiTags,
} from "@nestjs/swagger";
import { GraphResponseDto } from "../dto/api.dto";
import { AgentGraphService } from "../providers/agent-graph.service";
import type { AgentGraph } from "../providers/agent-graph.service";

@ApiTags("agents")
@Controller("api/agents/:id")
export class GraphController {
	constructor(
		@Inject(AgentGraphService) private readonly graph: AgentGraphService,
	) {}

	private readonly logger = new Logger("graph-controller");

	@Get("graph")
	@ApiOperation({
		summary: "Get agent graph",
		description:
			"Returns the agent graph (nodes and edges) for the selected root agent. Tools are always included.",
	})
	@ApiParam({ name: "id", description: "Agent identifier (relative path)" })

	@ApiOkResponse({ type: GraphResponseDto })
	async getGraph(@Param("id") id: string): Promise<AgentGraph> {
		try {
			const agentPath = decodeURIComponent(id);
			return await this.graph.getGraph(agentPath);
		} catch (e) {
			this.logger.error(
				`Failed to build graph for id='${id}': ${e instanceof Error ? e.message : String(e)}`,
			);
			// Do not fail the request; return an empty graph so UI can handle gracefully
			return { nodes: [], edges: [] };
		}
	}
}
