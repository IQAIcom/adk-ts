import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
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

	@Get("graph")
	@ApiOperation({
		summary: "Get agent graph",
		description:
			"Returns the agent graph (nodes and edges) for the selected root agent. Optionally include tools and DOT format.",
	})
	@ApiParam({ name: "id", description: "Agent identifier (relative path)" })
	@ApiQuery({
		name: "includeTools",
		required: false,
		type: Boolean,
		description: "Include tool nodes for LlmAgents (default: true)",
	})
	@ApiQuery({
		name: "format",
		required: false,
		enum: ["json", "dot"],
		description: "If 'dot', include Graphviz DOT in response",
	})
	@ApiOkResponse({ type: GraphResponseDto })
	async getGraph(
		@Param("id") id: string,
		@Query("includeTools") includeTools?: string,
		@Query("format") format?: "json" | "dot",
	): Promise<AgentGraph> {
		const agentPath = decodeURIComponent(id);
		const include = includeTools == null ? true : includeTools === "true";
		return this.graph.getGraph(agentPath, { includeTools: include, format });
	}
}
