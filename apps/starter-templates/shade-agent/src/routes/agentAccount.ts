import { agent, agentAccountId } from "@neardefi/shade-agent-js";
import { Hono } from "hono";

const app = new Hono();

app.get("/", async (c) => {
	try {
		// Get the agents account Id
		const accountId = await agentAccountId();

		// Get the balance of the agent account
		const balance = await agent("getBalance");

		return c.json({
			accountId: accountId.accountId,
			balance: balance.balance,
		});
	} catch (error) {
		console.error("Error getting agent account:", error);
		return c.json({ error: "Failed to get agent account" }, 500);
	}
});

export default app;
