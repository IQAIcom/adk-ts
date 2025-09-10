import { requestSignature } from "@neardefi/shade-agent-js";
import { utils } from "chainsig.js";
import { Contract, JsonRpcProvider } from "ethers";
import { Hono } from "hono";
import { getRootAgent } from "../agents/agent";
import {
	Evm,
	ethContractAbi,
	ethContractAddress,
	ethRpcUrl,
} from "../utils/ethereum";

const { toRSV, uint8ArrayToHex } = utils.cryptography;

const app = new Hono();

app.get("/", async (c) => {
	try {
		// Fetch the environment variable inside the route
		const contractId = process.env.NEXT_PUBLIC_contractId;
		if (!contractId) {
			return c.json({ error: "Contract ID not configured" }, 500);
		}

		// Get the data from agent
		const { sessionService, runner, session } = await getRootAgent();

		// Run models to get price and sentiment
		await runner.ask("Give ethereum's price and sentiment");

		// Get the latest state after the agent run is complete
		const currentSession = await sessionService.getSession(
			session.appName,
			session.userId,
			session.id,
		);

		if (!currentSession) {
			throw Error("session not found");
		}

		// The state contains price set by price tool and sentiment set by sentiment agent
		const { price, sentiment } = currentSession.state as {
			price: number;
			sentiment: string;
		};

		if (!price) {
			return c.json({ error: "Failed to fetch ETH price" }, 500);
		}

		// Get the transaction and payload to sign
		const { transaction, hashesToSign } = await getMarketDataPayload(
			price,
			sentiment,
			contractId,
		);

		// Call the agent contract to get a signature for the payload
		const signRes = await requestSignature({
			path: "ethereum-1",
			payload: uint8ArrayToHex(hashesToSign[0]),
		});

		// Reconstruct the signed transaction
		const signedTransaction = Evm.finalizeTransactionSigning({
			transaction,
			rsvSignatures: [toRSV(signRes)],
		});

		// Broadcast the signed transaction
		const txHash = await Evm.broadcastTx(signedTransaction);

		// Send back both the txHash and the new price optimistically
		return c.json({
			txHash: txHash.hash,
			newPrice: price,
		});
	} catch (error) {
		console.error("Failed to send the transaction:", error);
		return c.json({ error: "Failed to send the transaction" }, 500);
	}
});

async function getMarketDataPayload(
	ethPrice: number,
	ethSentiment: string,
	contractId: string,
) {
	// Derive the price pusher Ethereum address
	const { address: senderAddress } = await Evm.deriveAddressAndPublicKey(
		contractId,
		"ethereum-1",
	);
	// Create a new JSON-RPC provider for the Ethereum network
	const provider = new JsonRpcProvider(ethRpcUrl);
	// Create a new contract interface for the Ethereum Oracle contract
	const contract = new Contract(ethContractAddress, ethContractAbi, provider);
	// Encode the function data for the updatePrice function
	const data = contract.interface.encodeFunctionData("updateMarketData", [
		ethPrice,
		ethSentiment,
	]);
	// Prepare the transaction for signing
	const { transaction, hashesToSign } = await Evm.prepareTransactionForSigning({
		from: senderAddress,
		to: ethContractAddress,
		data,
	});

	return { transaction, hashesToSign };
}

export default app;
