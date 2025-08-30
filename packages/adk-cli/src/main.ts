#!/usr/bin/env node
import "reflect-metadata";

import { CommandFactory } from "nest-commander";
import { AppModule } from "./app.module";

async function bootstrap() {
	await CommandFactory.run(AppModule, {
		logger: ["log", "error", "warn"],
	});
}

bootstrap();
