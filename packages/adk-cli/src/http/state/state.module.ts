import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { SessionsModule } from "../sessions/sessions.module";
import { StateController } from "./state.controller";
import { StateService } from "./state.service";

@Module({
	imports: [ProvidersModule, SessionsModule],
	providers: [StateService],
	controllers: [StateController],
})
export class StateModule {}
