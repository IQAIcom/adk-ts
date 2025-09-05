import { InMemorySessionService } from "@iqai/adk";
import { Module } from "@nestjs/common";
import { TOKENS } from "../../common/tokens";
import { AgentLoader } from "./agent-loader.service";
import { AgentManager } from "./agent-manager.service";
import { AgentScanner } from "./agent-scanner.service";

@Module({
	providers: [
		// Core session service from @iqai/adk
		{
			provide: InMemorySessionService,
			useFactory: () => new InMemorySessionService(),
		},

		// Core services wired through DI, passing quiet flag and session service
		{
			provide: AgentScanner,
			inject: [TOKENS.QUIET],
			useFactory: (quiet: boolean) => new AgentScanner(quiet),
		},
		{
			provide: AgentLoader,
			inject: [TOKENS.QUIET],
			useFactory: (quiet: boolean) => new AgentLoader(quiet),
		},
		{
			provide: AgentManager,
			inject: [InMemorySessionService, TOKENS.QUIET],
			useFactory: (sessionService: InMemorySessionService, quiet: boolean) =>
				new AgentManager(sessionService, quiet),
		},
	],
	exports: [InMemorySessionService, AgentScanner, AgentLoader, AgentManager],
})
export class ProvidersModule {}
