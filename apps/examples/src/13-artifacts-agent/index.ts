import fs from "node:fs";
import path from "node:path";
import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";

function ensureDir(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

function readFileAsBase64(filePath: string): string {
	const buf = fs.readFileSync(filePath);
	return Buffer.from(buf).toString("base64");
}

function getSampleImageBase64(): { data: string; mimeType: string } {
	// 1x1 red PNG (small, safe inline sample)
	const data =
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ctZJQgAAAAASUVORK5CYII=";
	return { data, mimeType: "image/png" };
}

async function main() {
	const dataDir = path.resolve(__dirname, "data");
	ensureDir(dataDir);

	// Prepare text file (create if missing)
	const textFilePath = path.join(dataDir, "test.txt");
	if (!fs.existsSync(textFilePath)) {
		fs.writeFileSync(
			textFilePath,
			[
				"Hello from ADK artifacts example!",
				"This file demonstrates passing a text artifact to the agent.",
				"The agent should read and summarize these contents.",
			].join("\n"),
			"utf8",
		);
	}

	// Optional: look for a real image at data/sample.png or data/sample.jpg
	const candidateImages = [
		path.join(dataDir, "sample.png"),
		path.join(dataDir, "sample.jpg"),
		path.join(dataDir, "sample.jpeg"),
	];

	let imageBase64: string;
	let imageMime: string;
	const realImagePath = candidateImages.find((p) => fs.existsSync(p));
	if (realImagePath) {
		imageBase64 = readFileAsBase64(realImagePath);
		const ext = path.extname(realImagePath).toLowerCase();
		imageMime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
		console.log(`Using local image: ${path.basename(realImagePath)}`);
	} else {
		const sample = getSampleImageBase64();
		imageBase64 = sample.data;
		imageMime = sample.mimeType;
		console.log(
			"No local image found in apps/examples/src/13-artifacts-agent/data. Using a tiny built-in sample image.",
		);
	}

	const modelId = env.LLM_MODEL || "gemini-2.5-flash";
	const builder = AgentBuilder.withModel(modelId).withInstruction(
		[
			"You can analyze images and read attached files.",
			"When an image is provided, describe it concisely.",
			"When a text file is provided, output its contents and a one-line summary.",
		].join("\n"),
	);

	// 1) Image understanding
	// Parts use Google GenAI-compatible shape with inlineData
	const imageResponse = await builder.ask({
		parts: [
			{ text: "Describe the attached image succinctly." },
			{
				inlineData: {
					mimeType: imageMime,
					data: imageBase64,
				},
			} as any,
		],
	});

	console.log("\n🖼️ Image explanation:\n", imageResponse);

	// 2) Text file reading
	const textBase64 = readFileAsBase64(textFilePath);
	const fileResponse = await builder.ask({
		parts: [
			{
				text: "Read the attached text file, print its contents verbatim, then provide a one-line summary.",
			},
			{
				inlineData: {
					mimeType: "text/plain",
					data: textBase64,
				},
			} as any,
		],
	});

	console.log("\n📄 File contents and summary:\n", fileResponse);
}

main().catch((err) => {
	console.error("Artifacts example failed:", err);
	process.exit(1);
});
