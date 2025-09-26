import { serve } from "@hono/node-server";
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type Network, paymentMiddleware, type Resource } from "x402-hono";

config();

// Configuration from environment variables
const facilitatorUrl =
	(process.env.FACILITATOR_URL as Resource) || "https://x402.org/facilitator";
const payTo = process.env.ADDRESS as `0x${string}`;
const network = (process.env.NETWORK as Network) || "base-sepolia";

if (!payTo) {
	console.error("❌ Please set your wallet ADDRESS in the .env file");
	process.exit(1);
}

const app = new Hono();

// Define paid routes and prices in one place so we can expose them
const PAID_ROUTES: Record<string, { price: string; network: Network }> = {
	"/api/prices": { price: "$0.01", network },
	"/api/holdings": { price: "$0.05", network },
	"/api/agents/info": { price: "$0.05", network },
	"/api/agents/stats": { price: "$0.05", network },
	"/api/agents/top": { price: "$0.10", network },
};

app.use(
	"/*",
	cors({
		origin: ["http://localhost:3001"],
		credentials: true,
	}),
);

app.use(
	paymentMiddleware(payTo, PAID_ROUTES, {
		url: facilitatorUrl,
	}),
);

// Free endpoint to let clients know the x402 prices for paid endpoints
app.get("/api/price-list", (c) => {
	return c.json({ prices: PAID_ROUTES });
});

const IQ_API_BASE = "https://app.iqai.com/api";

app.get("/api/prices", async (c) => {
	try {
		const res = await fetch(`${IQ_API_BASE}/prices`);
		if (!res.ok) return c.json({ error: "Upstream error" }, 502);
		const text = await res.text();
		return c.body(text, 200, { "Content-Type": "application/json" });
	} catch {
		return c.json({ error: "Failed to fetch prices" }, 502);
	}
});

app.get("/api/holdings", async (c) => {
	const address = c.req.query("address");
	if (!address) return c.json({ error: "address is required" }, 400);
	try {
		const url = new URL(`${IQ_API_BASE}/holdings`);
		url.searchParams.set("address", address);
		const res = await fetch(url);
		if (!res.ok) return c.json({ error: "Upstream error" }, 502);
		const text = await res.text();
		return c.body(text, 200, { "Content-Type": "application/json" });
	} catch {
		return c.json({ error: "Failed to fetch holdings" }, 502);
	}
});

app.get("/api/agents/info", async (c) => {
	const address = c.req.query("address");
	if (!address) return c.json({ error: "address is required" }, 400);
	try {
		const url = new URL(`${IQ_API_BASE}/agents/info`);
		url.searchParams.set("address", address);
		const res = await fetch(url);
		if (!res.ok) return c.json({ error: "Upstream error" }, 502);
		const text = await res.text();
		return c.body(text, 200, { "Content-Type": "application/json" });
	} catch {
		return c.json({ error: "Failed to fetch agent info" }, 502);
	}
});

app.get("/api/agents/stats", async (c) => {
	const address = c.req.query("address");
	if (!address) return c.json({ error: "address is required" }, 400);
	try {
		const url = new URL(`${IQ_API_BASE}/agents/stats`);
		url.searchParams.set("address", address);
		const res = await fetch(url);
		if (!res.ok) return c.json({ error: "Upstream error" }, 502);
		const text = await res.text();
		return c.body(text, 200, { "Content-Type": "application/json" });
	} catch {
		return c.json({ error: "Failed to fetch agent stats" }, 502);
	}
});

app.get("/api/agents/top", async (c) => {
	const sort = c.req.query("sort") || "mcap";
	const limit = c.req.query("limit") || "10";
	try {
		const url = new URL(`${IQ_API_BASE}/agents/top`);
		if (sort) url.searchParams.set("sort", sort);
		if (limit) url.searchParams.set("limit", limit);
		const res = await fetch(url);
		if (!res.ok) return c.json({ error: "Upstream error" }, 502);
		const text = await res.text();
		return c.body(text, 200, { "Content-Type": "application/json" });
	} catch {
		return c.json({ error: "Failed to fetch top agents" }, 502);
	}
});

console.log(`
🚀 Server up and running!!
`);

serve({
	fetch: app.fetch,
	port: 3001,
});
