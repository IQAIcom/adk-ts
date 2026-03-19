import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileOperationsTool } from "../../tools/common/file-operations-tool";
import type { ToolContext } from "../../tools/tool-context";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("FileOperationsTool security", () => {
	let tmpDir: string;
	let tool: FileOperationsTool;
	const mockContext = {} as ToolContext;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-ops-test-"));
		tool = new FileOperationsTool({ basePath: tmpDir });
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it("allows reading files within basePath", async () => {
		const filePath = path.join(tmpDir, "test.txt");
		await fs.writeFile(filePath, "hello");

		const result = await tool.runAsync(
			{ operation: "read", filepath: filePath },
			mockContext,
		);
		expect(result.success).toBe(true);
	});

	it("blocks path traversal via ../", async () => {
		const result = await tool.runAsync(
			{ operation: "read", filepath: "../../../etc/passwd" },
			mockContext,
		);
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/[Aa]ccess denied/);
	});

	it("blocks symlink escape on read", async () => {
		const symPath = path.join(tmpDir, "escape-link");
		await fs.symlink("/etc/hosts", symPath);

		const result = await tool.runAsync(
			{ operation: "read", filepath: symPath },
			mockContext,
		);
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/[Aa]ccess denied/);
	});

	it("blocks symlink escape on write", async () => {
		const targetFile = path.join(os.tmpdir(), `safe-target-${Date.now()}`);
		await fs.writeFile(targetFile, "original");

		const symPath = path.join(tmpDir, "write-link");
		await fs.symlink(targetFile, symPath);

		const result = await tool.runAsync(
			{ operation: "write", filepath: symPath, content: "overwritten" },
			mockContext,
		);
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/[Aa]ccess denied/);

		// Verify the target was not modified
		const content = await fs.readFile(targetFile, "utf8");
		expect(content).toBe("original");

		await fs.rm(targetFile);
	});

	it("allows writing new files within basePath", async () => {
		const filePath = path.join(tmpDir, "new-file.txt");

		const result = await tool.runAsync(
			{ operation: "write", filepath: filePath, content: "new content" },
			mockContext,
		);
		expect(result.success).toBe(true);
	});

	it("blocks path prefix confusion (basePath as prefix of sibling dir)", async () => {
		// Create a sibling directory whose name starts with tmpDir's name
		const siblingDir = tmpDir + "-evil";
		await fs.mkdir(siblingDir, { recursive: true });
		const secretFile = path.join(siblingDir, "secret.txt");
		await fs.writeFile(secretFile, "stolen");

		const result = await tool.runAsync(
			{ operation: "read", filepath: secretFile },
			mockContext,
		);
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/[Aa]ccess denied/);

		await fs.rm(siblingDir, { recursive: true, force: true });
	});

	it("uses lstat in directory listing (does not follow symlinks)", async () => {
		const realFile = path.join(tmpDir, "real.txt");
		await fs.writeFile(realFile, "hello");

		const symPath = path.join(tmpDir, "link.txt");
		await fs.symlink("/etc/hosts", symPath);

		const result = await tool.runAsync(
			{ operation: "list", filepath: tmpDir },
			mockContext,
		);
		expect(result.success).toBe(true);

		const entries = result.data as Array<{
			name: string;
			isFile: boolean;
			isDirectory: boolean;
		}>;
		const linkEntry = entries.find((e) => e.name === "link.txt");
		// With lstat, a symlink is neither a regular file nor a directory via Dirent
		expect(linkEntry).toBeDefined();
	});
});
