#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const ADK_PACKAGE = path.join(ROOT_DIR, "packages/adk/package.json");

const SYNC_DIRS = [
	{ path: "apps/examples", pattern: "direct" }, // Only the direct package.json
	{ path: "apps/starter-templates", pattern: "subdirs" }, // All subdirectories
];

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

function findPackageJsonFiles(): string[] {
	const files: string[] = [];

	for (const { path: dirPath, pattern } of SYNC_DIRS) {
		const fullPath = path.join(ROOT_DIR, dirPath);

		if (!fs.existsSync(fullPath)) {
			console.warn(`⚠️  Directory not found: ${dirPath}`);
			continue;
		}

		if (pattern === "direct") {
			// Check for package.json directly in this directory
			const pkgPath = path.join(dirPath, "package.json");
			const fullPkgPath = path.join(ROOT_DIR, pkgPath);
			if (fs.existsSync(fullPkgPath)) {
				files.push(pkgPath);
			}
		} else if (pattern === "subdirs") {
			// Check for package.json in each subdirectory
			const entries = fs.readdirSync(fullPath, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const pkgPath = path.join(dirPath, entry.name, "package.json");
					const fullPkgPath = path.join(ROOT_DIR, pkgPath);
					if (fs.existsSync(fullPkgPath)) {
						files.push(pkgPath);
					}
				}
			}
		}
	}

	return files;
}

function updatePackageJson(filePath: string, adkVersion: string): void {
	const fullPath = path.join(ROOT_DIR, filePath);
	const content = fs.readFileSync(fullPath, "utf-8");
	const pkg: PackageJson = JSON.parse(content);

	let updated = false;

	// Update version if this is an example or starter template
	if (filePath.includes("examples") || filePath.includes("starter-templates")) {
		// Extract major.minor from ADK version and set patch to 0
		const adkMatch = adkVersion.match(/^(\d+\.\d+)/);
		if (adkMatch && pkg.version) {
			const targetVersion = `${adkMatch[1]}.0`;
			if (pkg.version !== targetVersion) {
				pkg.version = targetVersion;
				updated = true;
				console.log(
					`Updated ${filePath} version to ${pkg.version} (aligned with ADK)`,
				);
			}
		}
	}

	// Update @iqai/adk dependency in both dependencies and devDependencies
	const depTypes = ["dependencies", "devDependencies"] as const;
	for (const depType of depTypes) {
		if (pkg[depType]?.["@iqai/adk"]) {
			if (pkg[depType]!["@iqai/adk"] !== adkVersion) {
				pkg[depType]!["@iqai/adk"] = adkVersion;
				updated = true;
				console.log(
					`Updated @iqai/adk in ${filePath} to ${adkVersion} (${depType})`,
				);
			}
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

		const packageFiles = findPackageJsonFiles();

		if (packageFiles.length === 0) {
			console.warn("⚠️  No package.json files found to sync");
			return;
		}

		console.log(`Found ${packageFiles.length} package.json file(s) to check\n`);

		for (const file of packageFiles) {
			updatePackageJson(file, adkVersion);
		}

		console.log("\n✨ Version sync complete!");
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

main();
