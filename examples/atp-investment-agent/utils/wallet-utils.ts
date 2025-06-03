import { createPublicClient, http, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { fraxtal } from "viem/chains";

// Wallet utility functions for ATP Investment Agent
// This file provides helper functions for reading IQ token balance and wallet operations

export const IQ_TOKEN_ADDRESS = "0xCc3023635dF54FC0e43F47bc4BeB90c3d1fbDa9f";// IQT for testing

/**
 * Reads the IQ token balance for a given wallet address
 *
 * @param walletAddress - The wallet address to check balance for
 * @returns Promise<string> - The IQ balance in human-readable format (not wei)
 */
export async function getIqBalance(walletAddress: string): Promise<string> {
	try {
		const publicClient = createPublicClient({
			chain: fraxtal,
			transport: http(),
		});

		const balance = await publicClient.readContract({
			address: IQ_TOKEN_ADDRESS,
			abi: erc20Abi,
			functionName: "balanceOf",
			args: [walletAddress as `0x${string}`],
		});

		// Convert balance from wei to token units (assuming 18 decimals)
		const formattedBalance = (Number(balance) / 1e18).toFixed(2);
		return formattedBalance;
	} catch (error) {
		console.error("Error reading IQ balance:", error);
		throw new Error(
			`Failed to read IQ balance: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Calculates 1% of the available IQ balance for safe investment
 *
 * @param totalBalance - Total IQ balance as string
 * @returns string - 1% of the balance for investment
 */
export function calculateInvestmentAmount(totalBalance: string): string {
	const balance = Number.parseFloat(totalBalance);
	const investmentAmount = balance * 0.001; // 1% for safety

	// Return with reasonable precision (avoid tiny fractions)
	return investmentAmount.toFixed(2);
}

/**
 * Validates if wallet has sufficient IQ balance for investment
 *
 * @param balance - Current IQ balance as string
 * @param investmentAmount - Proposed investment amount as string
 * @returns boolean - True if sufficient balance available
 */
export function validateSufficientBalance(
	balance: string,
	investmentAmount: string,
): boolean {
	const balanceNum = Number.parseFloat(balance);
	const investmentNum = Number.parseFloat(investmentAmount);

	// Ensure some buffer (1.1x investment amount) to account for gas fees
	return balanceNum >= investmentNum * 1.1;
}

/**
 * Formats IQ amount for display in notifications
 *
 * @param amount - IQ amount as string
 * @returns string - Formatted amount with appropriate decimal places
 */
export function formatIqAmount(amount: string): string {
	const num = Number.parseFloat(amount);

	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(2)}M IQ`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(2)}K IQ`;
	}
	return `${num.toFixed(2)} IQ`;
}

/**
 * Gets wallet address from private key
 *
 * @param privateKey - Wallet private key (with or without 0x prefix)
 * @returns string - Wallet address
 */
export function getWalletAddress(privateKey: string): string {
	try {
		// Ensure private key has 0x prefix
		const formattedPrivateKey = privateKey.startsWith("0x")
			? privateKey
			: `0x${privateKey}`;

		const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
		return account.address;
	} catch (error) {
		console.error("Error deriving wallet address:", error);
		throw new Error(
			`Failed to derive wallet address: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
