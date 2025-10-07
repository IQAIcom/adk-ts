import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { AgentsController } from "./agents.controller";
import { GraphController } from "./graph.controller";

@Module({
	imports: [ProvidersModule],
	controllers: [AgentsController, GraphController],
})
export class DiscoveryModule {}
