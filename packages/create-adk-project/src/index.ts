import { existsSync } from "node:fs";
import { join } from "node:path";
import { confirm, intro, outro, select, spinner, text } from "@clack/prompts";
import chalk from "chalk";
import dedent from "dedent";
import { downloadTemplate } from "giget";
import { starters } from "./starters";

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
			await new Promise<void>((resolve, reject) => {
				const child = spawn(pm.command, ["--version"], {
					stdio: "pipe",
				});
				child.on("close", (code) => {
					if (code === 0) {
						available.push(pm);
					}
					resolve();
				});
				child.on("error", () => resolve());
			});
		} catch {
			// Package manager not available
		}
	}

	return available.length > 0 ? available : [packageManagers[0]]; // Fallback to npm
}

async function main() {
	console.clear();

	// Cool ASCII art intro
	console.log(
		chalk.magentaBright(dedent`
    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║     █████╗ ██████╗ ██╗  ██╗    ████████╗███████╗     ║
    ║    ██╔══██╗██╔══██╗██║ ██╔╝    ╚══██╔══╝██╔════╝     ║
    ║    ███████║██║  ██║█████╔╝        ██║   ███████╗     ║
    ║    ██╔══██║██║  ██║██╔═██╗        ██║   ╚════██║     ║
    ║    ██║  ██║██████╔╝██║  ██╗       ██║   ███████║     ║
    ║    ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝       ╚═╝   ╚══════╝     ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
  `),
	);

	intro(chalk.bgMagenta.bold(" ✨ Let's build something amazing! "));

	const projectName = await text({
		message: "What is your project name?",
		placeholder: "my-adk-project",
		validate: (value) => {
			if (!value) return "Project name is required";
			if (value.includes(" ")) return "Project name cannot contain spaces";
			if (existsSync(value)) return `Directory "${value}" already exists`;
			return undefined;
		},
	});

	if (typeof projectName === "symbol") {
		outro("Operation cancelled");
		process.exit(0);
	}

	const framework = await select({
		message: "Which template would you like to use?",
		options: starters,
	});

	if (typeof framework === "symbol") {
		outro("Operation cancelled");
		process.exit(0);
	}

	const selectedStarter = starters.find((s) => s.value === framework);
	if (!selectedStarter) {
		outro("Invalid starter selected");
		process.exit(1);
	}

	const installDeps = await confirm({
		message: "Install dependencies?",
		initialValue: true,
	});

	if (typeof installDeps === "symbol") {
		outro("Operation cancelled");
		process.exit(0);
	}

	let selectedPackageManager: PackageManager | undefined;
	if (installDeps) {
		const availablePackageManagers = await detectAvailablePackageManagers();

		if (availablePackageManagers.length > 1) {
			const pmChoice = await select({
				message: "Which package manager would you like to use?",
				options: availablePackageManagers.map((pm) => ({
					value: pm.name,
					label: pm.label,
					hint: `Use ${pm.command} for dependency management`,
				})),
			});

			if (typeof pmChoice === "symbol") {
				outro("Operation cancelled");
				process.exit(0);
			}

			selectedPackageManager = availablePackageManagers.find(
				(pm) => pm.name === pmChoice,
			);
		} else {
			selectedPackageManager = availablePackageManagers[0];
		}
	}

	const s = spinner();

	try {
		s.start("Creating project...");

		const templatePath = selectedStarter.template;
		const targetDir = join(process.cwd(), projectName);

		// Download template from GitHub
		await downloadTemplate(templatePath, {
			dir: targetDir,
			offline: false,
			preferOffline: false,
		});

		s.stop("Project created successfully!");

		if (installDeps && selectedPackageManager) {
			s.start(`Installing dependencies with ${selectedPackageManager.name}...`);

			const { spawn } = await import("node:child_process");

			await new Promise<void>((resolve, reject) => {
				const child = spawn(
					selectedPackageManager.command,
					selectedPackageManager.args,
					{
						cwd: targetDir,
						stdio: "pipe",
					},
				);

				child.on("close", (code) => {
					if (code === 0) {
						resolve();
					} else {
						reject(
							new Error(
								`${selectedPackageManager.command} ${selectedPackageManager.args.join(" ")} failed with code ${code}`,
							),
						);
					}
				});

				child.on("error", reject);
			});

			s.stop("Dependencies installed!");
		}

		const envFile = ".env";

		console.log(
			chalk.green(
				`${chalk.bold.yellow("🎉 SUCCESS!")} Your ADK project has been created!`,
			),
		);

		const runCommand =
			selectedPackageManager?.name === "npm"
				? "npm run dev"
				: selectedPackageManager?.name === "yarn"
					? "yarn dev"
					: selectedPackageManager?.name === "pnpm"
						? "pnpm dev"
						: selectedPackageManager?.name === "bun"
							? "bun run dev"
							: "npm run dev";

		const installCommand =
			selectedPackageManager?.name === "yarn"
				? "yarn"
				: selectedPackageManager
					? `${selectedPackageManager.command} ${selectedPackageManager.args.join(" ")}`
					: "npm install";

		const steps = [
			chalk.bold(`cd ${projectName}`),
			...(!installDeps ? [chalk.bold(installCommand)] : []),
			`${chalk.bold(`cp .env.example ${envFile}`)} ${chalk.gray(`# Add your API keys to the ${envFile} file`)}`,
			chalk.bold(runCommand),
		];

		const nextSteps = steps.map((step, index) => `${index + 1}. ${step}`);

		outro(
			chalk.cyan(
				dedent`
			${chalk.bold("🚀 Next steps:")}

			${nextSteps.join("\n			")}

			${chalk.bold.green("🤖 Your AI agent is ready to go!")}
			${chalk.gray("Documentation: https://adk.iqai.com")}
		`,
			),
		);
	} catch (error) {
		s.stop("Failed to create project");
		console.error(chalk.red("Error:"), error);
		process.exit(1);
	}
}

main().catch(console.error);
