import { type DynamicModule, Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { MessagingModule } from "./messaging/messaging.module";
import { ProvidersModule } from "./providers/providers.module";
import { ReloadModule } from "./reload/reload.module";
import type { RuntimeConfig } from "./runtime-config";
import { SessionsModule } from "./sessions/sessions.module";
import { StateModule } from "./state/state.module";

@Module({})
export class HttpModule {
	static register(config: RuntimeConfig): DynamicModule {
		return {
			module: HttpModule,
			imports: [
				ConfigModule.register(config),
				ProvidersModule,
				DiscoveryModule,
				MessagingModule,
				SessionsModule,
				EventsModule,
				StateModule,
				ReloadModule,
				HealthModule,
			],
		};
	}
}
