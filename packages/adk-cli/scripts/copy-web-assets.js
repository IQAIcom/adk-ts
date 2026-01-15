#!/usr/bin/env node
/**
 * copy-web-assets.js
 *
 * Copies the static web assets from adk-web's build output (out/)
 * to the CLI's web/ directory for bundled serving.
 *
 * This script runs as part of the CLI's postbuild step.
 */

const fs = require("node:fs");
const path = require("node:path");

const SRC_DIR = path.resolve(__dirname, "../../../apps/adk-web/out");
const DEST_DIR = path.resolve(__dirname, "../web");

function main() {
	// Check if source exists
	if (!fs.existsSync(SRC_DIR)) {
		console.warn("⚠️  Warning: adk-web/out not found");
		console.warn("   Run 'pnpm --filter @iqai/adk-web build' first");
		console.warn("   Skipping web asset copy...");
		return;
	}

	// Remove existing destination if it exists
	if (fs.existsSync(DEST_DIR)) {
		fs.rmSync(DEST_DIR, { recursive: true });
	}

	// Copy the files
	fs.cpSync(SRC_DIR, DEST_DIR, { recursive: true });

	// Count files for feedback
	const countFiles = (dir) => {
		let count = 0;
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				count += countFiles(path.join(dir, entry.name));
			} else {
				count++;
			}
		}
		return count;
	};

	const fileCount = countFiles(DEST_DIR);
	console.log(`✅ Copied ${fileCount} web assets to ${DEST_DIR}`);
}

main();
