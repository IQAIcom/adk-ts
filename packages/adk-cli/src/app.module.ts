import { Module } from "@nestjs/common";
import { CliModule } from "./cli/cli.module";

@Module({
	imports: [
		// Root composition: CLI commands only.
		// HTTP server is bootstrapped on demand from the ServeCommand via http/bootstrap.
		CliModule,
	],
})
export class AppModule {}
