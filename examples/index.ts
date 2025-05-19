import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import inquirer from "inquirer";

// Get all example directories and files
const examplesDir = path.resolve(__dirname);
const projectRoot = path.resolve(__dirname, "..");
const examples: { name: string; path: string }[] = [];

// Helper function to get all example files
function getExampleFiles(dir: string) {
	const items = fs.readdirSync(dir);

	for (const item of items) {
		// Skip these files
		if (item === "index.ts" || item === "run.ts") continue;

		const itemPath = path.join(dir, item);
		const stat = fs.statSync(itemPath);

		if (stat.isDirectory()) {
			// Check if directory contains an index.ts file
			const indexPath = path.join(itemPath, "index.ts");
			if (fs.existsSync(indexPath)) {
				examples.push({
					name: item,
					path: path.relative(examplesDir, indexPath),
				});
			}
		} else if (
			stat.isFile() &&
			(item.endsWith("-example.ts") || item.endsWith(".ts"))
		) {
			// Add standalone example files
			examples.push({
				name: item.replace(".ts", ""),
				path: path.relative(examplesDir, itemPath),
			});
		}
	}
}

// Get all examples
getExampleFiles(examplesDir);

// Sort examples alphabetically
examples.sort((a, b) => a.name.localeCompare(b.name));

async function main() {
	console.log(chalk?.blue("ADK Examples Runner") || "ADK Examples Runner");
	console.log("Select an example to run:\n");

	const { selectedExample } = await inquirer.prompt([
		{
			type: "list",
			name: "selectedExample",
			message: "Choose an example to run:",
			choices: examples.map((example) => ({
				name: example.name,
				value: example,
			})),
			pageSize: 20,
		},
	]);

	console.log(
		`\nRunning example: ${chalk?.green(selectedExample.name) || selectedExample.name}\n`,
	);

	// Get absolute paths to everything
	const tsNodeBin = path.resolve(
		projectRoot,
		"node_modules",
		".bin",
		"ts-node",
	);
	const tsconfigPath = path.resolve(projectRoot, "tsconfig.json");
	const examplePath = path.resolve(examplesDir, selectedExample.path);

	// Run the selected example with ts-node
	const exampleProcess = spawn(
		tsNodeBin,
		["-r", "tsconfig-paths/register", "--project", tsconfigPath, examplePath],
		{
			stdio: "inherit",
			shell: process.platform === "win32", // Use shell only on Windows
			cwd: projectRoot,
			env: {
				...process.env,
				TS_NODE_PROJECT: tsconfigPath,
			},
		},
	);

	exampleProcess.on("close", (code) => {
		console.log(
			`\nExample finished with ${
				code === 0
					? chalk?.green(`code ${code}`) || `code ${code}`
					: chalk?.red(`code ${code}`) || `code ${code}`
			}`,
		);
	});
}

main().catch(console.error);
