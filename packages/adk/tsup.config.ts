import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		constants: "src/telemetry/constants.ts",
	},
	format: ["cjs", "esm"],
	dts: true,
	splitting: false,
	clean: true,
});
