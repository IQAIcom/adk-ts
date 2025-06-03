import {
	getIqBalance,
	calculateInvestmentAmount,
	getWalletAddress,
	validateSufficientBalance,
	formatIqAmount,
} from "../utils/wallet-utils";

export interface WalletInfo {
	address: string;
	iqBalance: string;
	investmentAmount: string;
	formattedBalance: string;
	formattedInvestment: string;
}

export interface WalletValidationResult {
	isValid: boolean;
	error?: string;
	recommendation?: string;
}

export class WalletService {
	private privateKey: string;
	private minInvestmentAmount: number;
	private investmentPercentage: number;

	constructor(
		privateKey: string,
		minInvestmentAmount = 10,
		investmentPercentage = 0.01,
	) {
		this.privateKey = privateKey;
		this.minInvestmentAmount = minInvestmentAmount;
		this.investmentPercentage = investmentPercentage;
	}

	/**
	 * Gathers complete wallet information including balance and investment calculations
	 */
	async getWalletInfo(): Promise<WalletInfo> {
		console.log("💰 Getting wallet information...");

		try {
			const address = getWalletAddress(this.privateKey);
			const iqBalance = await getIqBalance(address);
			const investmentAmount = calculateInvestmentAmount(
				iqBalance,
				this.investmentPercentage,
			);

			console.log(`📍 Wallet: ${address}`);
			console.log(`💎 IQ Balance: ${iqBalance} IQ`);
			console.log(
				`📊 Investment Amount: ${investmentAmount} IQ (${this.investmentPercentage * 100}%)`,
			);

			return {
				address,
				iqBalance,
				investmentAmount,
				formattedBalance: formatIqAmount(iqBalance),
				formattedInvestment: formatIqAmount(investmentAmount),
			};
		} catch (error) {
			console.error("❌ Failed to get wallet information:", error);
			throw new Error(
				`Failed to retrieve wallet information: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Validates wallet conditions for investment
	 */
	async validateInvestmentConditions(
		walletInfo?: WalletInfo,
	): Promise<WalletValidationResult> {
		console.log("🎯 Evaluating investment conditions...");

		const info = walletInfo || (await this.getWalletInfo());

		// Check minimum balance
		if (!validateSufficientBalance(info.iqBalance, info.investmentAmount)) {
			return {
				isValid: false,
				error: "Insufficient IQ balance for investment",
				recommendation: `Ensure wallet has sufficient balance including gas fees (need ${(Number.parseFloat(info.investmentAmount) * 1.1).toFixed(2)} IQ minimum)`,
			};
		}

		// Check minimum investment amount
		const investmentNum = Number.parseFloat(info.investmentAmount);
		if (investmentNum < this.minInvestmentAmount) {
			return {
				isValid: false,
				error: `Investment amount ${info.investmentAmount} IQ below minimum ${this.minInvestmentAmount} IQ`,
				recommendation: `Increase wallet balance to at least ${(this.minInvestmentAmount * 100).toFixed(2)} IQ for meaningful investments`,
			};
		}

		console.log("✅ Investment conditions met");
		return { isValid: true };
	}

	/**
	 * Displays comprehensive wallet status
	 */
	async displayWalletStatus(): Promise<WalletInfo> {
		console.log("🔄 Gathering wallet information...");

		const walletInfo = await this.getWalletInfo();
		const validation = await this.validateInvestmentConditions(walletInfo);

		console.log(`📍 Wallet Address: ${walletInfo.address}`);
		console.log(`💰 Current IQ Balance: ${walletInfo.formattedBalance}`);
		console.log(
			`📊 Available for Investment: ${walletInfo.formattedInvestment} (${this.investmentPercentage * 100}% safety limit)`,
		);

		if (!validation.isValid) {
			console.error(`❌ ${validation.error}`);
			if (validation.recommendation) {
				console.log(`💡 Recommendation: ${validation.recommendation}`);
			}
			throw new Error(validation.error);
		}

		return walletInfo;
	}

	/**
	 * Quick balance check without full validation
	 */
	async getQuickBalance(): Promise<{ address: string; balance: string }> {
		const address = getWalletAddress(this.privateKey);
		const balance = await getIqBalance(address);
		return { address, balance };
	}

	/**
	 * Validates if a specific amount can be invested
	 */
	validateCustomAmount(
		walletBalance: string,
		proposedAmount: string,
	): WalletValidationResult {
		const balanceNum = Number.parseFloat(walletBalance);
		const amountNum = Number.parseFloat(proposedAmount);

		if (amountNum < this.minInvestmentAmount) {
			return {
				isValid: false,
				error: `Amount ${proposedAmount} IQ below minimum ${this.minInvestmentAmount} IQ`,
			};
		}

		// Check if amount exceeds 1% of balance
		const maxAmount = balanceNum * 0.01;
		if (amountNum > maxAmount) {
			return {
				isValid: false,
				error: `Amount ${proposedAmount} IQ exceeds 1% safety limit (${maxAmount.toFixed(2)} IQ)`,
			};
		}

		// Check sufficient balance with buffer for gas
		if (!validateSufficientBalance(walletBalance, proposedAmount)) {
			return {
				isValid: false,
				error: "Insufficient balance including gas fee buffer",
			};
		}

		return { isValid: true };
	}

	/**
	 * Gets the wallet address without balance check
	 */
	getAddress(): string {
		return getWalletAddress(this.privateKey);
	}

	/**
	 * Updates minimum investment amount
	 */
	setMinInvestmentAmount(amount: number): void {
		this.minInvestmentAmount = amount;
	}
}
