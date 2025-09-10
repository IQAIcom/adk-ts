import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	outDir: "dist",
	clean: true,
	dts: true,
	minify: false,
	sourcemap: true,
	target: "node22",
	banner: {
		js: "#!/usr/bin/env node\n",
	},
});
