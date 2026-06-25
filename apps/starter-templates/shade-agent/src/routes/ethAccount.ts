import { Hono } from "hono";
import { env } from "../env";
import { Evm } from "../utils/ethereum";

const app = new Hono();

app.get("/", async (c) => {
	// Fetch the environment variable inside the route
	const contractId = env.NEXT_PUBLIC_contractId;
	if (!contractId) {
		return c.json({ error: "Contract ID not configured" }, 500);
	}
	try {
		// Derive the price pusher Ethereum address
		const { address: senderAddress } = await Evm.deriveAddressAndPublicKey(
			contractId,
			"ethereum-1",
		);

		// Get the balance of the address
		const balance = await Evm.getBalance(senderAddress);

		return c.json({ senderAddress, balance: Number(balance.balance) });
	} catch (error) {
		console.log("Error getting the derived Ethereum address:", error);
		return c.json({ error: "Failed to get the derived Ethereum address" }, 500);
	}
});

export default app;
