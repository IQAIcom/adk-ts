import { env } from "node:process";
import { AgentBuilder, McpToolset, createTool } from "@iqai/adk";
import { z } from "zod";
import dedent from "dedent";

/**
 * 14 - NEAR Intents Complete 5-Step Workflow
 *
 * Demonstrates the complete NEAR Intents user flow:
 * [DISCOVERY] Use GET_NEAR_SWAP_TOKENS to discover available tokens
 * [STEP 1] Use GET_NEAR_SWAP_SIMPLE_QUOTE to check swap rates without addresses
 * [STEP 2] Use GET_NEAR_SWAP_FULL_QUOTE to get deposit address when ready to swap
 * [STEP 3] User sends funds to the deposit address (external action)
 * [STEP 4] Use EXECUTE_NEAR_SWAP to submit deposit transaction hash
 * [STEP 5] Use CHECK_NEAR_SWAP_STATUS to monitor swap progress until completion
 */

async function initializeNearIntents() {
	const nearToolset = new McpToolset({
		name: "NEAR Intents Server",
		description:
			"Real MCP server for NEAR cross-chain swaps via Defuse Protocol",
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["tsx", env.NEAR_INTENTS_MCP_PATH],
		},
	});

	console.log("🔌 Connecting to NEAR Intents MCP server...");
	const tools = await nearToolset.getTools();
	console.log(`✅ Connected! Found ${tools.length} tools available\n`);

	return { tools };
}

// Helper tool for simulating user deposit (since this is external)
const simulateDepositTool = createTool({
	name: "simulate_deposit",
	description:
		"Simulate user sending funds to deposit address (for demo purposes)",
	schema: z.object({
		depositAddress: z.string().describe("The deposit address to send funds to"),
		amount: z.string().describe("Amount being sent"),
		fromToken: z.string().describe("Token being sent"),
	}),
	fn: ({ depositAddress, amount, fromToken }, context) => {
		// Generate a mock transaction hash
		const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;

		// Store the transaction for next steps
		context.state.set("depositTransaction", {
			txHash,
			depositAddress,
			amount,
			fromToken,
			timestamp: new Date().toISOString(),
			status: "confirmed",
		});

		return {
			success: true,
			txHash,
			depositAddress,
			amount,
			fromToken,
			message: `✅ Simulated deposit of ${amount} ${fromToken} to ${depositAddress}`,
			transactionHash: txHash,
			note: "In a real application, the user would send this transaction from their wallet.",
		};
	},
});

async function executeCompleteNearIntentsFlow() {
	console.log("🌉 Complete NEAR Intents 5-Step Workflow");
	console.log("=========================================\n");

	const { tools } = await initializeNearIntents();

	const allTools = [...tools, simulateDepositTool];

	const { runner } = await AgentBuilder.create("near_workflow_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Assistant for complete NEAR cross-chain swap workflow")
		.withInstruction(dedent`
			You are a NEAR Intents workflow assistant that guides users through the complete 5-step process.
			
			ALWAYS follow this exact workflow in order:
			
			[DISCOVERY] Use GET_NEAR_SWAP_TOKENS to discover available tokens
			[STEP 1] Use GET_NEAR_SWAP_SIMPLE_QUOTE to check swap rates
			[STEP 2] Use GET_NEAR_SWAP_FULL_QUOTE to get deposit address  
			[STEP 3] Use simulate_deposit to simulate user sending funds
			[STEP 4] Use EXECUTE_NEAR_SWAP to submit transaction hash
			[STEP 5] Use CHECK_NEAR_SWAP_STATUS to monitor progress
			
			Use these realistic parameters:
			- Swap 0.1 ETH to USDC (available pair)
			- Recipient: 0x742d35Cc6634C0532925a3b8D24e7B7EBDBB3d1E
			- Refund: 0x1234567890123456789012345678901234567890
		`)
		.withTools(...allTools)
		.build();

	console.log("🚀 Starting complete NEAR Intents workflow demonstration...\n");

	const response = await runner.ask(dedent`
		Please demonstrate the complete NEAR Intents 5-step workflow for swapping 0.1 ETH to USDC.
		
		Execute each step in order:
		1. [DISCOVERY] Discover available tokens 
		2. [STEP 1] Get simple quote for 0.1 ETH to USDC
		3. [STEP 2] Get full quote with deposit address
		4. [STEP 3] Simulate the user deposit transaction
		5. [STEP 4] Execute the swap with transaction hash
		6. [STEP 5] Check swap status
	`);

	console.log(`\n${response}\n`);
}

async function demonstrateSimpleQuotes() {
	console.log("🔀 Simple Quote Flow");
	console.log("═══════════════════════════\n");

	const { tools } = await initializeNearIntents();

	const quickQuoteAgent = await AgentBuilder.create("quick_quote_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Agent for quick price discovery")
		.withInstruction(dedent`
			You provide quick price quotes for users who just want to check rates.
			Use GET_NEAR_SWAP_SIMPLE_QUOTE for fast price discovery.
			Focus on rates, fees, and timing - no addresses needed.
		`)
		.withTools(...tools)
		.build();

	const quickQuote = await quickQuoteAgent.runner.ask(
		"What's the current rate for swapping 1 ETH to USDC? Just show me the price and fees.",
	);
	console.log(`Quick Quote: ${quickQuote}\n`);
}

async function demonstrateCrossChainSwaps() {
	console.log("🌉 Cross-Chain Swap: ETH to SOL");
	console.log("═══════════════════════════════\n");

	const { tools } = await initializeNearIntents();

	const crossChainAgent = await AgentBuilder.create("cross_chain_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Agent for executing real cross-chain swaps")
		.withInstruction(dedent`
			You execute real cross-chain swaps using NEAR Intents.
			
			You are helping a user who wants to swap 0.1 ETH (on Ethereum) for SOL (on Solana).
			This is a real swap request that needs specific token addresses.
			
			Process:
			1. Use GET_NEAR_SWAP_TOKENS to find the exact ETH and SOL token IDs
			2. Use GET_NEAR_SWAP_SIMPLE_QUOTE with the specific token IDs to get a real quote
			3. Explain the rates, fees			
		`)
		.withTools(...tools)
		.build();

	console.log("🔗 User wants to swap 0.1 ETH for SOL across chains...");
	const crossChainResponse = await crossChainAgent.runner.ask(dedent`
		I want to swap 0.1 ETH (from Ethereum blockchain) to SOL (on Solana blockchain).
		
		Please:
		1. Find the exact token IDs for ETH on Ethereum and SOL on Solana
		2. Get me a real quote for this cross-chain swap
		3. Tell me the current rate, fees, and estimated timing
		
	`);

	console.log(`${crossChainResponse}\n`);
}

async function main() {
	console.log("🚀 NEAR Intents Complete Workflow Demo");
	console.log("======================================\n");

	try {
		// Execute the complete 5-step workflow
		await executeCompleteNearIntentsFlow();

		// Cross-chain swap examples
		await demonstrateCrossChainSwaps();

		// simple quote flow
		await demonstrateSimpleQuotes();

		console.log("🎉 **Complete NEAR Intents Demo Finished!**");
	} catch (error) {
		console.error("❌ Error:", error);
		console.log(dedent`
			ℹ️  Setup Required:
			1. Set NEAR_SWAP_JWT_TOKEN environment variable
			2. Ensure NEAR Intents MCP server is accessible
			3. Contact Defuse Protocol team for JWT access
		`);
	}
}

main().catch(console.error);
