import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { SessionsModule } from "../sessions/sessions.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
	imports: [ProvidersModule, SessionsModule],
	providers: [EventsService],
	controllers: [EventsController],
})
export class EventsModule {}
