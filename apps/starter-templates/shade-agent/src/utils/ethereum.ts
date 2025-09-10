import { chainAdapters, contracts } from "chainsig.js";
import { http, createPublicClient } from "viem";

export const ethRpcUrl = "https://sepolia.drpc.org";
export const ethContractAddress = "0xcDbf74b5395C882a547f7c9e7a5b0a3Bb4552eBF";

export const ethContractAbi = [
	{
		inputs: [],
		name: "getMarketData",
		outputs: [
			{ internalType: "string", name: "price", type: "string" },
			{ internalType: "string", name: "sentiment", type: "string" },
			{ internalType: "uint256", name: "timestamp", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "latestData",
		outputs: [
			{ internalType: "string", name: "price", type: "string" },
			{ internalType: "string", name: "sentiment", type: "string" },
			{ internalType: "uint256", name: "timestamp", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [
			{ internalType: "string", name: "_price", type: "string" },
			{ internalType: "string", name: "_sentiment", type: "string" },
		],
		name: "updateMarketData",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
] as const;

// Set up a chain signature contract instance
const MPC_CONTRACT = new contracts.ChainSignatureContract({
	networkId: "testnet",
	contractId: "v1.signer-prod.testnet",
});

// Set up a public client for the Ethereum network
const publicClient = createPublicClient({
	transport: http(ethRpcUrl),
});

// Set up a chain signatures chain adapter for the Ethereum network
export const Evm = new chainAdapters.evm.EVM({
	publicClient,
	contract: MPC_CONTRACT,
}) as any;
