import { Module } from "@nestjs/common";
import { ProvidersModule } from "../providers/providers.module";
import { RunnerController } from "./runner.controller";
import { RunnerService } from "./runner.service";

@Module({
	imports: [ProvidersModule],
	providers: [RunnerService],
	controllers: [RunnerController],
	exports: [RunnerService],
})
export class RunnerModule {}
