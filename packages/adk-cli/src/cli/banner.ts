import { join } from "node:path";
import chalk from "chalk";

// Brand color: hsl(331.29 100% 68.04%) ≈ rgb(255, 92, 170)
const brand = chalk.rgb(255, 92, 170);
const dim = chalk.dim;
const bold = chalk.bold;

const ADK_BANNER = `
${brand("   █████╗  ██████╗  ██╗  ██╗")}
${brand("  ██╔══██╗ ██╔══██╗ ██║ ██╔╝")}
${brand("  ███████║ ██║  ██║ █████╔╝")}
${brand("  ██╔══██║ ██║  ██║ ██╔═██╗")}
${brand("  ██║  ██║ ██████╔╝ ██║  ██╗")}
${brand("  ╚═╝  ╚═╝ ╚═════╝  ╚═╝  ╚═╝")}
`;

export function printWelcome(): void {
	let version = "unknown";
	try {
		const pkg = require(join(__dirname, "../../package.json"));
		version = pkg.version ?? version;
	} catch {
		// ignore
	}

	console.log(ADK_BANNER);
	console.log(
		`  ${brand("Agent Development Kit")} ${dim("—")} Build, test, and deploy AI agents with TypeScript.`,
	);
	console.log();
	console.log(`  ${dim(`v${version}`)}`);
	console.log();

	// NOTE: This list must be manually kept in sync with the commands in `cli.module.ts`
	const commands = [
		["new", "Create a new ADK project"],
		["run", "Start an interactive chat with an agent"],
		["serve", "Start an API server for agent management"],
		["web", "Start a web interface for testing agents"],
	];

	for (const [name, desc] of commands) {
		console.log(`  ${brand(bold(name.padEnd(10)))} ${desc}`);
	}

	console.log();
	console.log(`  ${dim("Docs:")}    ${dim("https://adk.iqai.com")}`);
	console.log(
		`  ${dim("GitHub:")}  ${dim("https://github.com/IQAIcom/adk-ts")}`,
	);
	console.log();
}
