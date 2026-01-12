import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class GrepTool extends BaseTool {
	private readonly config: GrepConfig = {
		maxMatches: 500,
		maxFileSize: 10 * 1024 * 1024, // 10MB
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
				"Search for patterns in files using regex. Supports glob patterns, case-insensitive search, context lines, and advanced filtering. Returns matching lines with file paths and line numbers.",
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
					pattern: {
						type: Type.STRING,
						description: "Regex pattern to search for",
					},
					files: {
						type: Type.STRING,
						description: "File path or glob pattern",
					},
					case_insensitive: {
						type: Type.BOOLEAN,
						description: "Case-insensitive search",
					},
					context_lines: {
						type: Type.NUMBER,
						description: "Context lines before/after match",
					},
					max_matches: {
						type: Type.NUMBER,
						description: "Maximum matches to return",
					},
					whole_word: {
						type: Type.BOOLEAN,
						description: "Match whole words only",
					},
					invert_match: { type: Type.BOOLEAN, description: "Invert match" },
					exclude: {
						type: Type.STRING,
						description: "Extra exclude patterns",
					},
					include: {
						type: Type.STRING,
						description: "Extra include patterns",
					},
				},
				required: ["pattern", "files"],
			},
		};
	}

	async runAsync(
		args: {
			pattern: string;
			files: string;
			case_insensitive?: boolean;
			context_lines?: number;
			max_matches?: number;
			whole_word?: boolean;
			invert_match?: boolean;
			exclude?: string;
			include?: string;
		},
		_context: ToolContext,
	): Promise<GrepResult> {
		const startTime = Date.now();
		const warnings: string[] = [];

		try {
			const validatedArgs = this.validateAndSanitizeArgs(args, warnings);
			const regex = this.buildRegex(
				validatedArgs.pattern,
				validatedArgs.case_insensitive,
				validatedArgs.whole_word,
			);

			const files = await this.resolveFiles(
				validatedArgs.files,
				validatedArgs.exclude,
				validatedArgs.include,
				warnings,
			);

			if (files.length === 0) {
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
					warnings: ["No files found matching the pattern"],
				};
			}

			const searchResult = await this.searchFiles(
				files,
				regex,
				validatedArgs.max_matches,
				validatedArgs.context_lines,
				validatedArgs.invert_match,
				warnings,
			);

			return {
				success: true,
				matches: searchResult.matches,
				stats: { ...searchResult.stats, duration: Date.now() - startTime },
				warnings: warnings.length ? warnings : undefined,
			};
		} catch (error) {
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
				error: error instanceof Error ? error.message : String(error),
				warnings: warnings.length ? warnings : undefined,
			};
		}
	}

	private validateAndSanitizeArgs(
		args: any,
		warnings: string[],
	): Required<typeof args> {
		if (!args.pattern?.trim())
			throw new Error("Search pattern cannot be empty");

		let contextLines = args.context_lines ?? this.config.contextLines;
		if (contextLines < 0) {
			warnings.push("context_lines cannot be negative, using 0");
			contextLines = 0;
		}
		if (contextLines > 10) {
			warnings.push("context_lines capped at 10");
			contextLines = 10;
		}

		let maxMatches = args.max_matches ?? this.config.maxMatches;
		if (maxMatches < 1) {
			warnings.push("max_matches must be at least 1, using 1");
			maxMatches = 1;
		}
		if (maxMatches > 1000) {
			warnings.push("max_matches capped at 1000");
			maxMatches = 1000;
		}

		return {
			...args,
			pattern: args.pattern.trim(),
			files: args.files.trim(),
			case_insensitive: args.case_insensitive ?? false,
			context_lines: contextLines,
			max_matches: maxMatches,
			whole_word: args.whole_word ?? false,
			invert_match: args.invert_match ?? false,
			exclude: args.exclude ?? "",
			include: args.include ?? "",
		};
	}

	private buildRegex(
		pattern: string,
		caseInsensitive: boolean,
		wholeWord: boolean,
	): RegExp {
		try {
			return new RegExp(
				wholeWord ? `\\b${pattern}\\b` : pattern,
				caseInsensitive ? "gi" : "g",
			);
		} catch (error) {
			throw new Error(
				`Invalid regex: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async resolveFiles(
		_filesPattern: string,
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

		const files: string[] = [];
		await this.walkDir(
			process.cwd(),
			files,
			excludePatterns,
			includePatterns,
			warnings,
		);

		return files.filter(async (f) => {
			try {
				const stats = await fs.stat(f);
				if (stats.size > this.config.maxFileSize) {
					warnings.push(`Skipping ${f}: exceeds max file size`);
					return false;
				}
				return true;
			} catch (e) {
				warnings.push(`Cannot access ${f}: ${e}`);
				return false;
			}
		});
	}

	private async walkDir(
		dir: string,
		outFiles: string[],
		excludePatterns: string[],
		includePatterns: string[],
		warnings: string[],
	) {
		let entries: Dirent[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			const relativePath = path
				.relative(process.cwd(), fullPath)
				.replace(/\\/g, "/");

			if (excludePatterns.some((p) => globToRegex(p).test(relativePath)))
				continue;

			if (entry.isDirectory()) {
				await this.walkDir(
					fullPath,
					outFiles,
					excludePatterns,
					includePatterns,
					warnings,
				);
				continue;
			}

			if (
				includePatterns.length &&
				!includePatterns.some((p) => globToRegex(p).test(relativePath))
			)
				continue;

			outFiles.push(fullPath);
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
		let limitReached = false;
		let filesMatched = 0;

		const tasks = files.map((file) => async () => {
			if (matches.length >= maxMatches) {
				limitReached = true;
				return;
			}
			filesSearched++;
			try {
				const fileMatches = await this.searchFile(
					file,
					regex,
					contextLines,
					invertMatch,
					maxMatches - matches.length,
				);
				if (fileMatches.length) {
					matches.push(...fileMatches);
					filesMatched++;
				}
			} catch (e) {
				warnings.push(`Error reading ${file}: ${e}`);
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
		remainingMatches: number,
	): Promise<GrepMatch[]> {
		const content = await fs.readFile(file, "utf8");
		const lines = content.split("\n");
		const matches: GrepMatch[] = [];

		for (
			let i = 0;
			i < lines.length && matches.length < remainingMatches;
			i++
		) {
			const line = lines[i];
			const match = line.match(regex);
			const hasMatch = !!match;
			const shouldInclude = invertMatch ? !hasMatch : hasMatch;
			if (!shouldInclude) continue;

			const column =
				!invertMatch && match && match.index !== undefined ? match.index : 0;
			const grepMatch: GrepMatch = {
				file: path.relative(process.cwd(), file),
				line: i + 1,
				column,
				content: line,
			};
			if (contextLines)
				grepMatch.context = {
					before: lines.slice(Math.max(0, i - contextLines), i),
					after: lines.slice(i + 1, i + 1 + contextLines),
				};
			matches.push(grepMatch);
		}

		return matches;
	}
}

function globToRegex(pattern: string): RegExp {
	// Escape regex special chars
	let regex = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");

	// Replace glob patterns
	regex = regex.replace(/\\\*\\\*/g, ".*"); // ** => any path
	regex = regex.replace(/\\\*/g, "[^/]*"); // * => anything except /
	regex = regex.replace(/\\\?/g, "."); // ? => single char

	// Basic alternation {a,b} => (a|b)
	regex = regex.replace(
		/\\\{([^}]+)\\\}/g,
		(_, group) => `(${group.replace(/,/g, "|")})`,
	);

	return new RegExp(`^${regex}$`);
}

async function asyncPool<T>(
	limit: number,
	tasks: (() => Promise<T>)[],
): Promise<T[]> {
	const results: T[] = [];
	const executing: Promise<void>[] = [];

	for (const task of tasks) {
		const p = task().then((res) => {
			results.push(res);
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

/** Single grep match */
interface GrepMatch {
	file: string;
	line: number;
	column: number;
	content: string;
	context?: {
		before: string[];
		after: string[];
	};
}

/** Grep result */
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
