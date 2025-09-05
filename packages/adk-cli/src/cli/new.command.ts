import { existsSync } from "node:fs";
import { join } from "node:path";
import { confirm, intro, outro, select, spinner, text } from "@clack/prompts";
import chalk from "chalk";
import dedent from "dedent";
import { downloadTemplate } from "giget";
import { Command, CommandRunner, Option } from "nest-commander";

interface NewOptions {
	template?: string;
}

interface Template {
	value: string;
	label: string;
	hint: string;
	source: string;
}

const templates: Template[] = [
	{
		value: "simple-agent",
		label: "🤖 Simple Agent",
		hint: "Basic agent with chat capabilities",
		source: "github:IQAIcom/adk-ts/apps/starter-templates/simple-agent",
	},
	{
		value: "discord-bot",
		label: "🎮 Discord Bot",
		hint: "Agent integrated with Discord",
		source: "github:IQAIcom/adk-ts/apps/starter-templates/discord-bot",
	},
	{
		value: "telegram-bot",
		label: "📱 Telegram Bot",
		hint: "Agent integrated with Telegram",
		source: "github:IQAIcom/adk-ts/apps/starter-templates/telegram-bot",
	},
	{
		value: "hono-server",
		label: "🚀 Hono Server",
		hint: "Web server with agent endpoints",
		source: "github:IQAIcom/adk-ts/apps/starter-templates/hono-server",
	},
	{
		value: "shade-agent",
		label: "🌓 Near Shade Agent",
		hint: "Starter that uses Near Shade Agent",
		source: "github:IQAIcom/adk-ts/apps/starter-templates/shade-agent",
	},
	{
		value: "mcp-starter",
		label: "🔌 MCP Integration",
		hint: "Model Context Protocol server",
		source: "github:IQAIcom/adk-ts/apps/starter-templates/mcp-starter",
	},
];

interface PackageManager {
	name: string;
	command: string;
	args: string[];
	label: string;
}

const packageManagers: PackageManager[] = [
	{ name: "npm", command: "npm", args: ["install"], label: "📦 npm" },
	{ name: "pnpm", command: "pnpm", args: ["install"], label: "⚡ pnpm" },
	{ name: "yarn", command: "yarn", args: ["install"], label: "🧶 yarn" },
	{ name: "bun", command: "bun", args: ["install"], label: "🍞 bun" },
];

async function detectAvailablePackageManagers(): Promise<PackageManager[]> {
	const { spawn } = await import("node:child_process");
	const available: PackageManager[] = [];

	for (const pm of packageManagers) {
		try {
			await new Promise<void>((resolve) => {
				const child = spawn(pm.command, ["--version"], { stdio: "pipe" });
				child.on("close", (code) => {
					if (code === 0) available.push(pm);
					resolve();
				});
				child.on("error", () => resolve());
			});
		} catch {
			// ignore
		}
	}
	return available.length > 0 ? available : [packageManagers[0]];
}

@Command({
	name: "new",
	description: "Create a new ADK project",
	arguments: "[project-name]",
})
export class NewCommand extends CommandRunner {
	async run(passedParams: string[], options?: NewOptions): Promise<void> {
		const projectNameArg = passedParams?.[0];
		console.clear();
		intro(chalk.magentaBright("🧠 Create new ADK-TS project"));

		let finalProjectName = projectNameArg;
		if (!finalProjectName) {
			const response = await text({
				message: "What is your project name?",
				placeholder: "my-adk-project",
				validate: (value) => {
					if (!value) return "Project name is required";
					if (value.includes(" ")) return "Project name cannot contain spaces";
					if (existsSync(value)) return `Directory "${value}" already exists`;
					return undefined;
				},
			});
			if (typeof response === "symbol") {
				outro("Operation cancelled");
				process.exit(0);
			}
			finalProjectName = response;
		}

		let selectedTemplate = options?.template;
		if (
			!selectedTemplate ||
			!templates.find((t) => t.value === selectedTemplate)
		) {
			const framework = await select({
				message: "Which template would you like to use?",
				options: templates.map((t) => ({
					value: t.value,
					label: t.label,
					hint: t.hint,
				})),
			});
			if (typeof framework === "symbol") {
				outro("Operation cancelled");
				process.exit(0);
			}
			selectedTemplate = framework;
		}

		const template = templates.find((t) => t.value === selectedTemplate);
		if (!template) {
			outro("Invalid template selected");
			process.exit(1);
		}

		if (existsSync(finalProjectName)) {
			outro(chalk.red(`Directory "${finalProjectName}" already exists`));
			process.exit(1);
		}

		const s = spinner();
		s.start("Downloading template...");
		try {
			await downloadTemplate(template.source, {
				dir: finalProjectName,
				registry: "gh",
			});
			s.stop("Template downloaded!");
		} catch (error) {
			s.stop("Failed to download template");
			outro(chalk.red(`Error: ${error}`));
			process.exit(1);
		}

		const availablePackageManagers = await detectAvailablePackageManagers();
		let selectedPackageManager: PackageManager;

		if (availablePackageManagers.length === 1) {
			selectedPackageManager = availablePackageManagers[0];
		} else {
			const packageManagerChoice = await select({
				message: "Which package manager would you like to use?",
				options: availablePackageManagers.map((pm) => ({
					value: pm.name,
					label: pm.label,
				})),
			});
			if (typeof packageManagerChoice === "symbol") {
				outro("Operation cancelled");
				process.exit(0);
			}
			selectedPackageManager = availablePackageManagers.find(
				(pm) => pm.name === packageManagerChoice,
			)!;
		}

		const shouldInstall = await confirm({
			message: "Install dependencies?",
			initialValue: true,
		});
		if (typeof shouldInstall === "symbol") {
			outro("Operation cancelled");
			process.exit(0);
		}

		if (shouldInstall) {
			const s2 = spinner();
			s2.start(
				`Installing dependencies with ${selectedPackageManager.name}...`,
			);
			const { spawn } = await import("node:child_process");
			const projectPath = join(process.cwd(), finalProjectName);

			try {
				await new Promise<void>((resolve, reject) => {
					const child = spawn(
						selectedPackageManager.command,
						selectedPackageManager.args,
						{
							cwd: projectPath,
							stdio: "pipe",
						},
					);
					child.on("close", (code) => {
						if (code === 0) resolve();
						else
							reject(
								new Error(`Package installation failed with code ${code}`),
							);
					});
					child.on("error", reject);
				});
				s2.stop("Dependencies installed!");
			} catch (_error) {
				s2.stop("Failed to install dependencies");
				console.log(
					chalk.yellow("\nYou can install dependencies manually by running:"),
				);
				console.log(
					chalk.cyan(
						`cd ${finalProjectName} && ${selectedPackageManager.command} ${selectedPackageManager.args.join(" ")}`,
					),
				);
			}
		}

		outro(
			chalk.green(
				dedent`
        🎉 Project created successfully!

        Next steps:
        ${chalk.cyan(`cd ${finalProjectName}`)}
        ${shouldInstall ? "" : chalk.cyan(`${selectedPackageManager.command} ${selectedPackageManager.args.join(" ")}`)}
        ${chalk.cyan("npm run dev")} or ${chalk.cyan("yarn dev")} or ${chalk.cyan("pnpm dev")}

        Happy coding! 🚀
      `,
			),
		);
	}

	@Option({
		flags: "-t, --template <template>",
		description:
			"Template to use (simple-agent, discord-bot, telegram-bot, hono-server, mcp-starter)",
	})
	parseTemplate(val: string): string {
		return val;
	}
}
