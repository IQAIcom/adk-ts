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
		// Read version from this package.json at runtime; fallback to env or unknown
		let version: string | undefined;
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const pkg = require("../../package.json");
			if (pkg && typeof pkg.version === "string") {
				version = pkg.version;
			}
		} catch {}
		version = version ?? process.env.ADK_CLI_VERSION ?? undefined;
		return { status: "ok", version };
	}
}
