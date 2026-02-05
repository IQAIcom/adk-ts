import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { SessionsModule } from "../sessions/sessions.module";
import { ArtifactsController } from "./artifacts.controller";
import { ArtifactsService } from "./artifacts.service";

@Module({
	imports: [ProvidersModule, SessionsModule],
	providers: [ArtifactsService],
	controllers: [ArtifactsController],
	exports: [ArtifactsService],
})
export class ArtifactsModule {}
