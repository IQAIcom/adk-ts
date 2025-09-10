import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";

import agentAccount from "./routes/agentAccount";
import ethAccount from "./routes/ethAccount";
import transaction from "./routes/transaction";

// Load environment variables from .env file (only needed for local development)
if (process.env.NODE_ENV !== "production") {
	dotenv.config({ path: ".env.development.local" });
}

/**
 * Hono Server with AI Agent
 *
 * A web server using Hono framework that exposes AI agent functionality via REST API.
 */
const app = new Hono();

// Middleware
app.use(cors());

// Routes
app.get("/", (c) => c.json({ message: "App is running" }));
app.route("/api/eth-account", ethAccount);
app.route("/api/agent-account", agentAccount);
app.route("/api/transaction", transaction);

const port = Number(process.env.PORT || "3000");

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
