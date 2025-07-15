import chalk from "chalk";

interface LoggerOpts {
	name: string;
}
export class Logger {
	name: string;
	isDebugEnabled = isDebugEnabled();

	constructor({ name }: LoggerOpts) {
		this.name = name;
	}

	private colorize(message: string): string {
		// Framework logs are colored blue, user logs are default
		return chalk.blue(message);
	}

	debug(message: string, ...args: any[]) {
		if (this.isDebugEnabled) {
			const time = new Date().toLocaleTimeString();
			console.log(
				this.colorize(`[${time}] 🐛 [${this.name}] ${message}`),
				...args
			);
		}
	}

	info(message: string, ...args: any[]) {
		const time = new Date().toLocaleTimeString();
		console.info(
			this.colorize(`[${time}] ℹ️ [${this.name}] ${message}`),
			...args
		);
	}

	warn(message: string, ...args: any[]) {
		const time = new Date().toLocaleTimeString();
		console.warn(
			this.colorize(`[${time}] 🚧 [${this.name}] ${message}`),
			...args
		);
	}

	error(message: string, ...args: any[]) {
		const time = new Date().toLocaleTimeString();
		console.error(
			this.colorize(`[${time}] ❌ [${this.name}] ${message}`),
			...args
		);
	}

	/**
	 * Logs structured data in a visually appealing table format.
	 * Uses vertical layout for better readability and respects debug settings.
	 */
	debugStructured(title: string, data: Record<string, any>): void {
		if (!this.isDebugEnabled) return;

		// Use terminal width or fallback to 60 if not available
		const terminalWidth = process.stdout.columns || 60;
		const width = Math.min(terminalWidth, 100); // Cap at 100 to avoid overly wide tables
		const contentWidth = width - 4; // Account for "│ " and " │"
		const topBorder = `┌${"─".repeat(width - 2)}┐`;
		const bottomBorder = `└${"─".repeat(width - 2)}┘`;
		const middleBorder = `├${"─".repeat(width - 2)}┤`;

		console.log(this.colorize(topBorder));
		console.log(this.colorize(`│ ${title.padEnd(contentWidth)} │`));
		console.log(this.colorize(middleBorder));

		// Log each field in a clean vertical format
		Object.entries(data).forEach(([key, value]) => {
			const formattedKey = key.padEnd(20); // Consistent width for alignment
			const formattedValue = String(value);
			const availableValueSpace = contentWidth - 20 - 2; // -20 for key, -2 for ": "

			const truncatedValue =
				formattedValue.length > availableValueSpace
					? `${formattedValue.substring(0, availableValueSpace - 3)}...`
					: formattedValue;

			// Build the content line and ensure it's exactly contentWidth
			const content = `${formattedKey}: ${truncatedValue}`;
			const paddedContent = content.padEnd(contentWidth);

			console.log(this.colorize(`│ ${paddedContent} │`));
		});

		console.log(this.colorize(bottomBorder));
	}

	/**
	 * Logs array data in a compact, readable format.
	 */
	debugArray(title: string, items: Array<Record<string, any>>): void {
		if (!this.isDebugEnabled) return;

		// Use terminal width or fallback to 78 if not available
		const terminalWidth = process.stdout.columns || 78;
		const width = Math.min(terminalWidth, 120); // Cap at 120 to avoid overly wide tables
		const contentWidth = width - 4; // Account for "│ " and " │"
		const topBorder = `┌${"─".repeat(width - 2)}┐`;
		const bottomBorder = `└${"─".repeat(width - 2)}┘`;
		const middleBorder = `├${"─".repeat(width - 2)}┤`;

		console.log(this.colorize(topBorder));
		console.log(this.colorize(`│ ${title.padEnd(contentWidth)} │`));
		console.log(this.colorize(middleBorder));

		items.forEach((item, index) => {
			const itemStr = Object.entries(item)
				.map(([k, v]) => `${k}: ${v}`)
				.join(" • ");

			const indexPart = `[${index + 1}] `;
			const availableSpace = contentWidth - indexPart.length;

			const truncatedItem =
				itemStr.length > availableSpace
					? `${itemStr.substring(0, availableSpace - 3)}...`
					: itemStr;

			// Build the content line and ensure it's exactly contentWidth
			const content = `${indexPart}${truncatedItem}`;
			const paddedContent = content.padEnd(contentWidth);

			console.log(this.colorize(`│ ${paddedContent} │`));
		});

		console.log(this.colorize(bottomBorder));
	}
}
export function isDebugEnabled(): boolean {
	return (
		process.env.NODE_ENV === "development" || process.env.ADK_DEBUG === "true"
	);
}
