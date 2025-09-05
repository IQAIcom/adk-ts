import { Module } from "@nestjs/common";
import { HotReloadService } from "./hot-reload.service";
import { ReloadController } from "./reload.controller";

@Module({
	providers: [HotReloadService],
	controllers: [ReloadController],
	exports: [HotReloadService],
})
export class ReloadModule {}
