import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as p from "@clack/prompts";
import * as dotenv from "dotenv";

// Get all example directories and files
const examplesSrcDir = path.resolve(__dirname);
const turborepoRoot = path.resolve(__dirname, "..", ".."); // Go up to turborepo root
const examples: { name: string; path: string }[] = [];

dotenv.config({ path: path.resolve(examplesSrcDir, "..", ".env") });

// Helper function to get all example files
function getExampleFiles(dir: string) {
	const items = fs.readdirSync(dir);

	for (const item of items) {
		// Skip these files
		if (item === "index.ts" || item === "run.ts" || item === "utils.ts")
			continue;

		const itemPath = path.join(dir, item);
		const stat = fs.statSync(itemPath);

		if (stat.isDirectory()) {
			// Check if directory contains an index.ts file
			const indexPath = path.join(itemPath, "index.ts");
			if (fs.existsSync(indexPath)) {
				examples.push({
					name: item,
					path: path.relative(examplesSrcDir, indexPath),
				});
			}
		} else if (
			stat.isFile() &&
			(item.endsWith("-example.ts") || item.endsWith(".ts"))
		) {
			// Add standalone example files
			examples.push({
				name: item.replace(".ts", ""),
				path: path.relative(examplesSrcDir, itemPath),
			});
		}
	}
}

// Parse command line arguments
function parseArgs() {
	const args = process.argv.slice(2);
	const nameIndex = args.indexOf("--name");

	if (nameIndex !== -1 && nameIndex + 1 < args.length) {
		return { name: args[nameIndex + 1] };
	}

	return { name: null };
}

// Function to run an example
function runExample(example: { name: string; path: string }) {
	console.log(`\nRunning example: ${example.name}\n`);

	const examplePath = path.resolve(examplesSrcDir, example.path);

	// Use pnpm exec tsx - this is the most reliable approach in turborepo
	const exampleProcess = spawn("pnpm", ["exec", "tsx", examplePath], {
		stdio: "inherit",
		shell: process.platform === "win32", // Use shell only on Windows
		cwd: turborepoRoot, // Run from turborepo root so pnpm workspace resolution works
		env: {
			...process.env,
		},
	});

	exampleProcess.on("error", (error) => {
		console.error("Failed to start example process:", error);
		console.log("Make sure tsx is installed. Try running: pnpm add -D tsx");
		process.exit(1);
	});

	exampleProcess.on("close", (code) => {
		if (code === 0) {
			p.outro(`Example finished successfully (code ${code})`);
		} else {
			console.log(`\nExample finished with error code ${code}`);
			process.exit(code || 1);
		}
	});
}

async function main() {
	// Get all examples
	getExampleFiles(examplesSrcDir);

	// Sort examples alphabetically
	examples.sort((a, b) => a.name.localeCompare(b.name));

	const { name } = parseArgs();

	// If --name argument is provided, try to find and run the example directly
	if (name) {
		const matchedExample = examples.find(
			(example) => example.name.toLowerCase() === name.toLowerCase(),
		);

		if (matchedExample) {
			runExample(matchedExample);
			return;
		}
		console.error(`Example "${name}" not found.`);
		console.log("\nAvailable examples:");
		examples.forEach((example) => console.log(`  - ${example.name}`));
		process.exit(1);
	}

	// Interactive mode
	p.intro("ADK Examples Runner");
	console.log("Select an example to run:\n");

	const selectedExample = await p.select({
		message: "Choose an example to run:",
		options: examples.map((example) => ({
			label: example.name,
			value: example,
		})),
	});

	if (p.isCancel(selectedExample)) {
		p.cancel("Operation cancelled");
		process.exit(0);
	}

	runExample(selectedExample);
}

main().catch((error) => {
	console.error("Error running example:", error);
	process.exit(1);
});
