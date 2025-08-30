import { Module } from "@nestjs/common";
import { NewCommand } from "./commands/new.command";
import { RunCommand } from "./commands/run.command";
import { ServeCommand } from "./commands/serve.command";
import { WebCommand } from "./commands/web.command";

@Module({
	imports: [],
	providers: [ServeCommand, NewCommand, RunCommand, WebCommand],
	exports: [],
})
export class CliModule {}
