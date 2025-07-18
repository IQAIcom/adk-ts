import { runAdkCli } from "./cli";

runAdkCli().catch((error) => {
	console.error("CLI Error:", error);
	process.exit(1);
});
