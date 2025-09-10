import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthResponseDto } from "../dto/api.dto";

@ApiTags("health")
@Controller()
export class HealthController {
	@Get("health")
	@ApiOperation({
		summary: "Health check",
		description:
			"Basic liveness probe returning status: ok when the service is up.",
	})
	@ApiOkResponse({ type: HealthResponseDto })
	health() {
		return { status: "ok" };
	}
}
