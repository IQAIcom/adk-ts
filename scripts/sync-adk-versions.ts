import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const ADK_PACKAGE = path.join(ROOT_DIR, "packages/adk/package.json");

const SYNC_DIRS = ["apps/examples", "apps/starter-templates"];

interface PackageJson {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[key: string]: unknown;
}

function getAdkVersion(): string {
	const content = fs.readFileSync(ADK_PACKAGE, "utf-8");
	const pkg: PackageJson = JSON.parse(content);
	if (!pkg.version) {
		throw new Error("Could not find version in ADK package.json");
	}
	return pkg.version;
}

function findPackageJsonFiles(dir: string): string[] {
	const fullPath = path.join(ROOT_DIR, dir);
	if (!fs.existsSync(fullPath)) {
		console.warn(`⚠️  Directory not found: ${dir}`);
		return [];
	}

	const packageFiles: string[] = [];

	function traverse(currentPath: string, relativePath: string) {
		const entries = fs.readdirSync(currentPath, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = path.join(currentPath, entry.name);
			const relativeEntryPath = path.join(relativePath, entry.name);

			if (entry.isDirectory() && entry.name !== "node_modules") {
				traverse(entryPath, relativeEntryPath);
			} else if (entry.isFile() && entry.name === "package.json") {
				packageFiles.push(relativeEntryPath);
			}
		}
	}

	traverse(fullPath, dir);
	return packageFiles;
}

function updatePackageJson(filePath: string, adkVersion: string): void {
	const fullPath = path.join(ROOT_DIR, filePath);
	const content = fs.readFileSync(fullPath, "utf-8");
	const pkg: PackageJson = JSON.parse(content);

	let updated = false;

	// Update version if this is an example or starter template
	if (filePath.includes("examples") || filePath.includes("starter-templates")) {
		// For examples and starters, align their patch version with ADK
		// Extract major.minor from ADK version
		const adkMatch = adkVersion.match(/^(\d+\.\d+)/);
		if (adkMatch) {
			const majorMinor = adkMatch[1];
			const currentMatch = pkg.version?.match(/^(\d+\.\d+)/);
			if (currentMatch && currentMatch[1] !== majorMinor) {
				pkg.version = `${majorMinor}.0`;
				updated = true;
				console.log(
					`Updated ${filePath} version to ${pkg.version} (aligned with ADK)`,
				);
			}
		}
	}

	// Update @iqai/adk dependency
	if (pkg.dependencies?.["@iqai/adk"]) {
		if (pkg.dependencies["@iqai/adk"] !== adkVersion) {
			pkg.dependencies["@iqai/adk"] = adkVersion;
			updated = true;
			console.log(
				`Updated @iqai/adk in ${filePath} to ${adkVersion} (dependencies)`,
			);
		}
	}

	if (pkg.devDependencies?.["@iqai/adk"]) {
		if (pkg.devDependencies["@iqai/adk"] !== adkVersion) {
			pkg.devDependencies["@iqai/adk"] = adkVersion;
			updated = true;
			console.log(
				`Updated @iqai/adk in ${filePath} to ${adkVersion} (devDependencies)`,
			);
		}
	}

	if (updated) {
		fs.writeFileSync(fullPath, `${JSON.stringify(pkg, null, "\t")}\n`);
	} else {
		console.log(`✓ ${filePath} is already in sync`);
	}
}

function main(): void {
	try {
		const adkVersion = getAdkVersion();
		console.log(`🔄 Syncing ADK version: ${adkVersion}\n`);

		const allPackageFiles: string[] = [];
		for (const dir of SYNC_DIRS) {
			const files = findPackageJsonFiles(dir);
			allPackageFiles.push(...files);
		}

		if (allPackageFiles.length === 0) {
			console.warn("⚠️  No package.json files found to sync");
			return;
		}

		console.log(
			`Found ${allPackageFiles.length} package.json file(s) to check\n`,
		);

		for (const file of allPackageFiles) {
			updatePackageJson(file, adkVersion);
		}

		console.log("\n✨ Version sync complete!");
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

main();
