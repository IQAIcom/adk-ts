import { createTool } from "@iqai/adk";
import type { AxiosInstance } from "axios";
import axios from "axios";
import {
	type Address,
	createWalletClient,
	http,
	type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { withPaymentInterceptor } from "x402-axios";
import { z } from "zod";
import { env } from "../../env";

const API_BASE_URL = "http://localhost:3001";

// Base axios instance without payment interceptor
const baseApiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

function getWalletClient(): WalletClient {
	const account = privateKeyToAccount(env.WALLET_PRIVATE_KEY as Address);

	return createWalletClient({
		account,
		chain: baseSepolia,
		transport: http(),
	});
}

// This will be dynamically set based on wallet connection
const apiClient: AxiosInstance = withPaymentInterceptor(
	baseApiClient,
	// biome-ignore lint/suspicious/noExplicitAny: <>
	getWalletClient() as any,
);

const getPrices = createTool({
	name: "GET_PRICES",
	description: "Get x402 endpoint prices (free) to inform users about costs",
	fn: async () => {
		const response = await baseApiClient.get("/api/price-list");
		return response.data;
	},
});

const getHoldings = createTool({
	name: "GET_HOLDINGS",
	description: "Get wallet holdings for IQ AI agents",
	schema: z.object({
		address: z.string().describe("wallet address to fetch holdings for"),
	}),
	fn: async ({ address }) => {
		const response = await apiClient.get(`/api/holdings`, {
			params: { address },
		});
		return response.data;
	},
});

const getAgentInfo = createTool({
	name: "GET_AGENT_INFO",
	description: "Get agent metadata by token contract address",
	schema: z.object({
		address: z.string().describe("agent token contract address"),
	}),
	fn: async ({ address }) => {
		const response = await apiClient.get(`/api/agents/info`, {
			params: { address },
		});
		return response.data;
	},
});

const getAgentStats = createTool({
	name: "GET_AGENT_STATS",
	description: "Get agent stats by token contract address",
	schema: z.object({
		address: z.string().describe("agent token contract address"),
	}),
	fn: async ({ address }) => {
		const response = await apiClient.get(`/api/agents/stats`, {
			params: { address },
		});
		return response.data;
	},
});

const getTopAgents = createTool({
	name: "GET_TOP_AGENTS",
	description: "Get top agents list",
	schema: z
		.object({
			sort: z.enum(["mcap", "holders", "inferences"]).default("mcap"),
			limit: z.number().int().min(1).max(100).default(10),
		})
		.partial(),
	fn: async ({
		sort,
		limit,
	}: {
		sort?: "mcap" | "holders" | "inferences";
		limit?: number;
	}) => {
		const resolvedSort = sort ?? "mcap";
		const resolvedLimit = limit ?? 10;
		const response = await apiClient.get(`/api/agents/top`, {
			params: { sort: resolvedSort, limit: resolvedLimit },
		});
		return response.data;
	},
});

export const clientTools = [
	getPrices,
	getHoldings,
	getAgentInfo,
	getAgentStats,
	getTopAgents,
];
