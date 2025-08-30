import { Controller, Get, Inject, Post } from "@nestjs/common";
import type { AgentListResponse } from "../../../common/types";
import { AgentManager } from "../providers/agent-manager.service";

function mapAgentsToResponse(agents: Map<string, any>): AgentListResponse[] {
	return Array.from(agents.values()).map((agent) => ({
		path: agent.absolutePath,
		name: agent.name,
		directory: agent.absolutePath,
		relativePath: agent.relativePath,
	}));
}

@Controller("api/agents")
export class AgentsController {
	constructor(
		@Inject(AgentManager) private readonly agentManager: AgentManager,
	) {}

	@Get()
	listAgents(): { agents: AgentListResponse[] } {
		const agentsList = mapAgentsToResponse(this.agentManager.getAgents());
		return { agents: agentsList };
	}

	@Post("refresh")
	refreshAgents(): { agents: AgentListResponse[] } {
		const agentsDir = process.cwd();
		this.agentManager.scanAgents(agentsDir);
		const agentsList = mapAgentsToResponse(this.agentManager.getAgents());
		return { agents: agentsList };
	}
}
