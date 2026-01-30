import { Controller, Delete, Get, Inject, Param } from "@nestjs/common";
import {
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags,
} from "@nestjs/swagger";
import {
	ArtifactResponseDto,
	ArtifactsListResponseDto,
	ArtifactVersionsResponseDto,
	SuccessResponseDto,
} from "../dto/api.dto";
import { ArtifactsService } from "./artifacts.service";

@ApiTags("artifacts")
@Controller("api/agents/:id/sessions/:sessionId/artifacts")
export class ArtifactsController {
	constructor(
		@Inject(ArtifactsService)
		private readonly artifacts: ArtifactsService,
	) {}

	@Get()
	@ApiOperation({
		summary: "List all artifacts for a session",
		description:
			"Returns all artifact filenames for the specified agent session.",
	})
	@ApiParam({
		name: "id",
		description: "URL-encoded absolute agent path or identifier",
	})
	@ApiParam({
		name: "sessionId",
		description: "Session identifier",
	})
	@ApiOkResponse({ type: ArtifactsListResponseDto })
	async listArtifacts(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.artifacts.listArtifacts(agentPath, sessionId);
	}

	@Get(":artifactName")
	@ApiOperation({
		summary: "Get an artifact",
		description: "Returns the latest version of the specified artifact.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiParam({ name: "sessionId", description: "Session identifier" })
	@ApiParam({ name: "artifactName", description: "Artifact filename" })
	@ApiOkResponse({ type: ArtifactResponseDto })
	async getArtifact(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
		@Param("artifactName") artifactName: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.artifacts.getArtifact(agentPath, sessionId, artifactName);
	}

	@Get(":artifactName/versions")
	@ApiOperation({
		summary: "List artifact versions",
		description: "Returns all available versions of the specified artifact.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiParam({ name: "sessionId", description: "Session identifier" })
	@ApiParam({ name: "artifactName", description: "Artifact filename" })
	@ApiOkResponse({ type: ArtifactVersionsResponseDto })
	async listArtifactVersions(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
		@Param("artifactName") artifactName: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.artifacts.listArtifactVersions(
			agentPath,
			sessionId,
			artifactName,
		);
	}

	@Get(":artifactName/versions/:versionId")
	@ApiOperation({
		summary: "Get a specific artifact version",
		description: "Returns a specific version of the specified artifact.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiParam({ name: "sessionId", description: "Session identifier" })
	@ApiParam({ name: "artifactName", description: "Artifact filename" })
	@ApiParam({ name: "versionId", description: "Version number" })
	@ApiOkResponse({ type: ArtifactResponseDto })
	async getArtifactVersion(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
		@Param("artifactName") artifactName: string,
		@Param("versionId") versionId: string,
	) {
		const agentPath = decodeURIComponent(id);
		const version = Number.parseInt(versionId, 10);
		return this.artifacts.getArtifactVersion(
			agentPath,
			sessionId,
			artifactName,
			version,
		);
	}

	@Delete(":artifactName")
	@ApiOperation({
		summary: "Delete an artifact",
		description: "Deletes all versions of the specified artifact.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiParam({ name: "sessionId", description: "Session identifier" })
	@ApiParam({ name: "artifactName", description: "Artifact filename" })
	@ApiOkResponse({ type: SuccessResponseDto })
	async deleteArtifact(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
		@Param("artifactName") artifactName: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.artifacts.deleteArtifact(agentPath, sessionId, artifactName);
	}
}
