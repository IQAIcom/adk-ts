import { type DynamicModule, Global, Module } from "@nestjs/common";
import { TOKENS } from "../../common/tokens";
import { RUNTIME_CONFIG, type RuntimeConfig } from "../runtime-config";

@Global()
@Module({})
export class ConfigModule {
	static register(config: RuntimeConfig): DynamicModule {
		return {
			module: ConfigModule,
			providers: [
				{ provide: RUNTIME_CONFIG, useValue: config },
				{ provide: TOKENS.AGENTS_DIR, useValue: config.agentsDir },
				{ provide: TOKENS.QUIET, useValue: config.quiet },
			],
			exports: [RUNTIME_CONFIG, TOKENS.AGENTS_DIR, TOKENS.QUIET],
		};
	}
}
