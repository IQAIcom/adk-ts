import { Module } from "@nestjs/common";
import { NewCommand } from "./new.command";
import { RunCommand } from "./run.command";
import { ServeCommand } from "./serve.command";
import { WebCommand } from "./web.command";

@Module({
	imports: [],
	providers: [ServeCommand, NewCommand, RunCommand, WebCommand],
	exports: [],
})
export class CliModule {}
