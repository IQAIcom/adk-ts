import { pathToFileURL } from "node:url";
import { Logger } from "@nestjs/common";
import z, { ZodError } from "zod";
import { EnvUtils } from "./env-utils";

export class ErrorHandlingUtils {
	constructor(private logger: Logger) {}

	isMissingEnvError(error: unknown): {
		isMissing: boolean;
		varName?: string;
		allMissing?: string[];
		requiredMissing?: string[];
		optionalMissing?: string[];
		hasOnlyOptionalMissing?: boolean;
	} {
		if (error instanceof ZodError) {
			const allMissingVars = (error as ZodError).issues
				.filter(
					(issue: z.ZodIssue): issue is z.ZodIssue & { code: "invalid_type" } =>
						issue.code === "invalid_type" && issue.expected !== "undefined",
				)
				.map((issue: z.ZodIssue) => issue.path?.[0])
				.filter((v: unknown): v is string => !!v);

			const requiredMissing: string[] = [];
			const optionalMissing: string[] = [];
			const optionalPatterns = [
				/^.*_DEBUG$/i,
				/^.*_ENABLED$/i,
				/^PORT$/i,
				/^HOST$/i,
				/^NODE_ENV$/i,
				/^ADK_/i,
			];

			for (const varName of allMissingVars) {
				if (optionalPatterns.some((p) => p.test(varName)))
					optionalMissing.push(varName);
				else requiredMissing.push(varName);
			}

			if (allMissingVars.length > 0) {
				return {
					isMissing: true,
					varName: allMissingVars[0],
					allMissing: allMissingVars,
					requiredMissing,
					optionalMissing,
					hasOnlyOptionalMissing:
						requiredMissing.length === 0 && optionalMissing.length > 0,
				};
			}
		}
		return { isMissing: false };
	}

	async handleImportError(
		error: unknown,
		outFile: string,
		projectRoot: string,
	): Promise<Record<string, unknown>> {
		const envUtils = new EnvUtils(this.logger);
		const envCheck = this.isMissingEnvError(error);

		if (envCheck.isMissing) {
			if (envCheck.hasOnlyOptionalMissing) {
				this.logger.warn(
					`⚠️  Missing optional environment variables: ${envCheck.optionalMissing?.join(", ")}`,
				);
			} else {
				this.logger.error(
					envUtils.generateEnvErrorMessage(
						projectRoot,
						envCheck.varName,
						envCheck.requiredMissing ?? envCheck.allMissing,
					),
				);
				throw new Error(
					`Missing required environment variable${
						envCheck.requiredMissing?.length &&
						envCheck.requiredMissing.length > 1
							? "s"
							: ""
					}: ${(envCheck.requiredMissing ?? envCheck.allMissing)?.join(", ")}`,
				);
			}
		}

		try {
			return (await import(pathToFileURL(outFile).href)) as Record<
				string,
				unknown
			>;
		} catch (fallbackErr) {
			throw new Error(
				`Failed to load agent: ${
					fallbackErr instanceof Error
						? fallbackErr.message
						: String(fallbackErr)
				}`,
			);
		}
	}

	/**
	 * Formats Zod or runtime errors into a human-readable string
	 */
	formatUserError(error: unknown): string {
		if (error instanceof ZodError) {
			const issues = (error as ZodError).issues.map((i: z.ZodIssue) => {
				const path = i.path?.length ? i.path.join(".") : "(root)";
				return `  • ${path}: ${i.message}`;
			});
			return [
				"",
				"❌ Validation Error",
				"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
				"Agent configuration or schema validation failed:",
				"",
				...issues,
				"",
				"💡 Tip: Check your agent's state schema, tools configuration,",
				"   or environment variable validation.",
				"",
			].join("\n");
		}

		if (error instanceof Error) {
			const category = this.categorizeErrorForConsole(error);
			const lines = [
				"",
				`❌ ${category.title}`,
				"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
				this.cleanErrorMessage(error.message),
			];

			if (category.suggestions.length > 0) {
				lines.push("");
				lines.push(...category.suggestions.map((s) => `💡 ${s}`));
			}

			// Only show stack in debug mode
			if (error.stack && process.env.ADK_DEBUG_NEST === "1") {
				lines.push("");
				lines.push("Stack trace:");
				lines.push(error.stack);
			}

			lines.push("");
			return lines.join("\n");
		}

		return [
			"",
			"❌ Unknown Error",
			"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
			String(error),
			"",
		].join("\n");
	}

	/**
	 * Categorize error for console output with helpful suggestions
	 */
	private categorizeErrorForConsole(error: Error): {
		title: string;
		suggestions: string[];
	} {
		const msg = error.message.toLowerCase();

		// Agent loading errors
		if (
			msg.includes("failed to load agent") ||
			msg.includes("failed to import")
		) {
			return {
				title: "Agent Loading Error",
				suggestions: [
					"Check your agent.ts file for syntax errors",
					"Ensure all imports are correct",
					"Verify dependencies are installed (npm install)",
				],
			};
		}

		// Module not found
		if (msg.includes("cannot find module")) {
			const moduleName = this.extractModuleName(error.message);
			return {
				title: "Module Not Found",
				suggestions: moduleName
					? [
							`Install the missing module: npm install ${moduleName}`,
							"Or add it to your package.json dependencies",
						]
					: [
							"Check your imports and package.json",
							"Run: npm install or pnpm install",
						],
			};
		}

		// Syntax errors
		if (error.name === "SyntaxError") {
			return {
				title: "Syntax Error",
				suggestions: [
					"Review your TypeScript/JavaScript code",
					"Check for missing brackets, quotes, or semicolons",
				],
			};
		}

		// Type errors
		if (error.name === "TypeError") {
			return {
				title: "Type Error",
				suggestions: [
					"Check for null or undefined values",
					"Verify object properties exist before accessing them",
				],
			};
		}

		// Agent not found
		if (msg.includes("agent not found")) {
			return {
				title: "Agent Not Found",
				suggestions: [
					"Verify the agent path is correct",
					"Run 'adk list' to see available agents",
				],
			};
		}

		// Runtime/execution errors
		if (
			msg.includes("runtime") ||
			msg.includes("execution") ||
			msg.includes("failed executing")
		) {
			return {
				title: "Agent Runtime Error",
				suggestions: ["Review your agent's code for runtime issues"],
			};
		}

		// Generic error
		return {
			title: error.name || "Error",
			suggestions: [],
		};
	}

	/**
	 * Clean up error messages by removing redundant prefixes
	 */
	private cleanErrorMessage(message: string): string {
		return message
			.replace(/^Error:\s*/i, "")
			.replace(/^Failed to\s+/i, "Failed to ")
			.trim();
	}

	/**
	 * Extract module name from error message
	 */
	private extractModuleName(message: string): string | null {
		const match = message.match(/Cannot find module ['"]([^'"]+)['"]/);
		return match ? match[1] : null;
	}
}
