import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
	},
	format: ["cjs", "esm"],
	dts: true,
	splitting: true,
	clean: true,
});
