import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
	},
	format: ["esm"],
	dts: true,
	splitting: false,
	clean: true,
	minify: false,
	sourcemap: true,
	banner: {
		js: "#!/usr/bin/env node",
	},
	target: "node18",
	platform: "node",
});
