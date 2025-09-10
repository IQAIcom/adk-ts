import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { SessionsModule } from "../sessions/sessions.module";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";

@Module({
	imports: [ProvidersModule, SessionsModule],
	providers: [MessagingService],
	controllers: [MessagingController],
})
export class MessagingModule {}
