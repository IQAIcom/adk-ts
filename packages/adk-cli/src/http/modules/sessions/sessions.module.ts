import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";

@Module({
	imports: [ProvidersModule],
	providers: [SessionsService],
	controllers: [SessionsController],
	exports: [SessionsService],
})
export class SessionsModule {}
