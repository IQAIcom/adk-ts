import { env } from "node:process";
import { serve } from "@hono/node-server";
import * as dotenv from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { askHandler } from "./routes/ask";
import { healthHandler } from "./routes/health";
import { indexHandler } from "./routes/index";

dotenv.config();

/**
 * Hono Server with AI Agent
 *
 * A web server using Hono framework that exposes AI agent functionality via REST API.
 */

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", prettyJSON());

// Routes
app.get("/", indexHandler);
app.get("/health", healthHandler);
app.post("/ask", askHandler);

const port = Number(env.PORT) || 3000;

console.log(`🚀 Started Hono server on port ${port}`);
console.log(`👉 Visit http://localhost:${port} to see the server in action`);

/**
 * Start the Hono server with the configured app and port.
 * The server exposes AI agent functionality through REST endpoints.
 */
serve({
	fetch: app.fetch,
	port,
});
