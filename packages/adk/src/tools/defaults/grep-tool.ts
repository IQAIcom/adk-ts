import type { Dirent, Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class GrepTool extends BaseTool {
	private readonly config: GrepConfig = {
		maxMatches: 500,
		maxFileSize: 10 * 1024 * 1024,
		contextLines: 2,
		excludePatterns: [
			"**/node_modules/**",
			"**/.git/**",
			"**/.next/**",
			"**/dist/**",
			"**/build/**",
			"**/.cache/**",
			"**/coverage/**",
			"**/.vscode/**",
			"**/.idea/**",
			"**/*.min.js",
			"**/*.bundle.js",
			"**/*.map",
		],
		includePatterns: [],
	};

	constructor(config?: Partial<GrepConfig>) {
		super({
			name: "grep",
			description:
				"Search for patterns in files using regex. Supports glob patterns, case-insensitive search, context lines, and advanced filtering.",
			shouldRetryOnFailure: false,
		});

		if (config) this.config = { ...this.config, ...config };
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					pattern: { type: Type.STRING },
					files: { type: Type.STRING },
					caseInsensitive: { type: Type.BOOLEAN },
					contextLines: { type: Type.NUMBER },
					maxMatches: { type: Type.NUMBER },
					wholeWord: { type: Type.BOOLEAN },
					invertMatch: { type: Type.BOOLEAN },
					exclude: { type: Type.STRING },
					include: { type: Type.STRING },
				},
				required: ["pattern", "files"],
			},
		};
	}

	async runAsync(
		args: {
			pattern: string;
			files: string;
			caseInsensitive?: boolean;
			contextLines?: number;
			maxMatches?: number;
			wholeWord?: boolean;
			invertMatch?: boolean;
			exclude?: string;
			include?: string;
		},
		_context: ToolContext,
	): Promise<GrepResult> {
		const startTime = Date.now();
		const warnings: string[] = [];

		try {
			const validated = this.validateAndSanitizeArgs(args, warnings);

			const regex = this.buildRegex(
				validated.pattern,
				validated.caseInsensitive,
				validated.wholeWord,
			);

			const files = await this.resolveFiles(
				validated.files,
				validated.exclude,
				validated.include,
				warnings,
			);

			if (!files.length) {
				return {
					success: true,
					matches: [],
					stats: {
						filesSearched: 0,
						filesMatched: 0,
						totalMatches: 0,
						limitReached: false,
						duration: Date.now() - startTime,
					},
					warnings: ["No files matched the provided pattern"],
				};
			}

			const result = await this.searchFiles(
				files,
				regex,
				validated.maxMatches,
				validated.contextLines,
				validated.invertMatch,
				warnings,
			);

			return {
				success: true,
				matches: result.matches,
				stats: { ...result.stats, duration: Date.now() - startTime },
				warnings: warnings.length ? warnings : undefined,
			};
		} catch (e) {
			return {
				success: false,
				matches: [],
				stats: {
					filesSearched: 0,
					filesMatched: 0,
					totalMatches: 0,
					limitReached: false,
					duration: Date.now() - startTime,
				},
				error: e instanceof Error ? e.message : String(e),
				warnings: warnings.length ? warnings : undefined,
			};
		}
	}

	private validateAndSanitizeArgs(args: any, warnings: string[]) {
		if (!args.pattern?.trim()) throw new Error("pattern cannot be empty");

		let contextLines = args.contextLines ?? this.config.contextLines;
		if (contextLines < 0) {
			warnings.push("contextLines < 0, using 0");
			contextLines = 0;
		}
		if (contextLines > 10) {
			warnings.push("contextLines capped at 10");
			contextLines = 10;
		}

		let maxMatches = args.maxMatches ?? this.config.maxMatches;
		if (maxMatches < 1) {
			warnings.push("maxMatches < 1, using 1");
			maxMatches = 1;
		}
		if (maxMatches > 1000) {
			warnings.push("maxMatches capped at 1000");
			maxMatches = 1000;
		}

		return {
			pattern: args.pattern.trim(),
			files: args.files.trim(),
			caseInsensitive: args.caseInsensitive ?? false,
			contextLines,
			maxMatches,
			wholeWord: args.wholeWord ?? false,
			invertMatch: args.invertMatch ?? false,
			exclude: args.exclude ?? "",
			include: args.include ?? "",
		};
	}

	private buildRegex(pattern: string, ci: boolean, ww: boolean): RegExp {
		return new RegExp(ww ? `\\b${pattern}\\b` : pattern, ci ? "gi" : "g");
	}

	private async resolveFiles(
		filesPattern: string,
		excludeArg: string,
		includeArg: string,
		warnings: string[],
	): Promise<string[]> {
		const excludePatterns = [
			...this.config.excludePatterns,
			...(excludeArg ? excludeArg.split(",").map((s) => s.trim()) : []),
		];
		const includePatterns = [
			...this.config.includePatterns,
			...(includeArg ? includeArg.split(",").map((s) => s.trim()) : []),
		];

		const cwd = process.cwd();
		const absPattern = path.resolve(cwd, filesPattern);
		const files: string[] = [];

		let stat: Stats | undefined;
		try {
			stat = await fs.stat(absPattern);
		} catch {
			stat = undefined;
		}

		if (stat?.isDirectory()) {
			await this.walkDir(absPattern, files, excludePatterns, includePatterns);
		} else {
			const baseDir = cwd;
			const matcher = globToRegex(filesPattern.replace(/\\/g, "/"));
			await this.walkDir(
				baseDir,
				files,
				excludePatterns,
				includePatterns,
				matcher,
			);
		}

		const filtered: string[] = [];
		for (const f of files) {
			try {
				const s = await fs.stat(f);
				if (s.size > this.config.maxFileSize) {
					warnings.push(`Skipping ${f}: exceeds max file size`);
					continue;
				}
				filtered.push(f);
			} catch (e) {
				warnings.push(`Cannot access ${f}: ${e}`);
			}
		}

		return filtered;
	}

	private async walkDir(
		dir: string,
		out: string[],
		exclude: string[],
		include: string[],
		matcher?: RegExp,
	) {
		let entries: Dirent[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const e of entries) {
			const full = path.join(dir, e.name);
			const rel = path.relative(process.cwd(), full).replace(/\\/g, "/");

			if (exclude.some((p) => globToRegex(p).test(rel))) continue;

			if (e.isDirectory()) {
				await this.walkDir(full, out, exclude, include, matcher);
				continue;
			}

			if (matcher && !matcher.test(rel)) continue;
			if (include.length && !include.some((p) => globToRegex(p).test(rel)))
				continue;

			out.push(full);
		}
	}

	private async searchFiles(
		files: string[],
		regex: RegExp,
		maxMatches: number,
		contextLines: number,
		invertMatch: boolean,
		warnings: string[],
	) {
		const matches: GrepMatch[] = [];
		let filesSearched = 0;
		let filesMatched = 0;
		let limitReached = false;

		const tasks = files.map((f) => async () => {
			if (matches.length >= maxMatches) {
				limitReached = true;
				return;
			}
			filesSearched++;
			try {
				const m = await this.searchFile(
					f,
					regex,
					contextLines,
					invertMatch,
					maxMatches - matches.length,
				);
				if (m.length) {
					matches.push(...m);
					filesMatched++;
				}
			} catch (e) {
				warnings.push(`Error reading ${f}: ${e}`);
			}
		});

		await asyncPool(5, tasks);

		return {
			matches,
			stats: {
				filesSearched,
				filesMatched,
				totalMatches: matches.length,
				limitReached,
			},
		};
	}

	private async searchFile(
		file: string,
		regex: RegExp,
		contextLines: number,
		invertMatch: boolean,
		remaining: number,
	): Promise<GrepMatch[]> {
		const lines = (await fs.readFile(file, "utf8")).split("\n");
		const matches: GrepMatch[] = [];

		for (let i = 0; i < lines.length && matches.length < remaining; i++) {
			const line = lines[i];
			const match = line.match(regex);
			const ok = invertMatch ? !match : !!match;
			if (!ok) continue;

			const m: GrepMatch = {
				file: path.relative(process.cwd(), file),
				line: i + 1,
				column: match?.index ?? 0,
				content: line,
			};

			if (contextLines) {
				m.context = {
					before: lines.slice(Math.max(0, i - contextLines), i),
					after: lines.slice(i + 1, i + 1 + contextLines),
				};
			}

			matches.push(m);
		}

		return matches;
	}
}

function globToRegex(pattern: string): RegExp {
	let r = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	r = r.replace(/\\\*\\\*/g, ".*");
	r = r.replace(/\\\*/g, "[^/]*");
	r = r.replace(/\\\?/g, ".");
	r = r.replace(/\\\{([^}]+)\\\}/g, (_, g) => `(${g.replace(/,/g, "|")})`);
	return new RegExp(`^${r}$`);
}

async function asyncPool<T>(
	limit: number,
	tasks: (() => Promise<T>)[],
): Promise<T[]> {
	const results: T[] = [];
	const executing: Promise<void>[] = [];

	for (const task of tasks) {
		const p = task().then((r) => {
			results.push(r);
		});
		executing.push(p);

		if (executing.length >= limit) {
			await Promise.race(executing);
			executing.splice(executing.indexOf(p), 1);
		}
	}

	await Promise.all(executing);
	return results;
}

interface GrepConfig {
	maxMatches: number;
	maxFileSize: number;
	contextLines: number;
	excludePatterns: string[];
	includePatterns: string[];
}

interface GrepMatch {
	file: string;
	line: number;
	column: number;
	content: string;
	context?: { before: string[]; after: string[] };
}

interface GrepResult {
	success: boolean;
	matches: GrepMatch[];
	stats: {
		filesSearched: number;
		filesMatched: number;
		totalMatches: number;
		limitReached: boolean;
		duration: number;
	};
	error?: string;
	warnings?: string[];
}
