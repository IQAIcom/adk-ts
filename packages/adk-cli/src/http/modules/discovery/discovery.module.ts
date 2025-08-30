import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { AgentsController } from "./agents.controller";

@Module({
	imports: [ProvidersModule],
	controllers: [AgentsController],
})
export class DiscoveryModule {}
