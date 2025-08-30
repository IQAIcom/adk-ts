import { type DynamicModule, Module } from "@nestjs/common";
import { ConfigModule } from "./modules/config/config.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { EventsModule } from "./modules/events/events.module";
import { HealthModule } from "./modules/health/health.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { ProvidersModule } from "./modules/providers/providers.module";
import { ReloadModule } from "./modules/reload/reload.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { StateModule } from "./modules/state/state.module";
import type { RuntimeConfig } from "./runtime-config";

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
