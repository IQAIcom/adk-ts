import { Module } from "@nestjs/common";
import { TraceController } from "./trace.controller";

@Module({
	controllers: [TraceController],
})
export class DebugModule {}
