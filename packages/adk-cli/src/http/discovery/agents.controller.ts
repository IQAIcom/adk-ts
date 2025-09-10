import { Controller, Get, Inject, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AgentListResponse } from "../../common/types";
import { AgentsListResponseDto } from "../dto/api.dto";
import { AgentManager } from "../providers/agent-manager.service";

function mapAgentsToResponse(agents: Map<string, any>): AgentListResponse[] {
	return Array.from(agents.values()).map((agent) => ({
		path: agent.absolutePath,
		name: agent.name,
		directory: agent.absolutePath,
		relativePath: agent.relativePath,
	}));
}

@ApiTags("agents")
@Controller("api/agents")
export class AgentsController {
	constructor(
		@Inject(AgentManager) private readonly agentManager: AgentManager,
	) {}

	@Get()
	@ApiOperation({
		summary: "List discovered agents",
		description:
			"Returns all agent entries found by scanning the agents directory. Each agent includes name, absolute, and relative paths.",
	})
	@ApiOkResponse({ type: AgentsListResponseDto })
	listAgents(): { agents: AgentListResponse[] } {
		const agentsList = mapAgentsToResponse(this.agentManager.getAgents());
		return { agents: agentsList };
	}

	@Post("refresh")
	@ApiOperation({
		summary: "Rescan and list agents",
		description:
			"Triggers a fresh scan of the agents directory and returns the updated agent list.",
	})
	@ApiOkResponse({ type: AgentsListResponseDto })
	refreshAgents(): { agents: AgentListResponse[] } {
		const agentsDir = process.cwd();
		this.agentManager.scanAgents(agentsDir);
		const agentsList = mapAgentsToResponse(this.agentManager.getAgents());
		return { agents: agentsList };
	}
}
