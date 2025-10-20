import { pathToFileURL } from "node:url";
import { Logger } from "@nestjs/common";
import z, { ZodError } from "zod";

import { EnvUtils } from "./env-utils";

export class ErrorHandlingUtils {
	constructor(private logger: Logger) {}

	/**
	 * Check if error is related to missing environment variables (Zod validation)
	 */
	isMissingEnvError(error: unknown): {
		isMissing: boolean;
		varName?: string;
		allMissing?: string[];
		requiredMissing?: string[];
		optionalMissing?: string[];
		hasOnlyOptionalMissing?: boolean;
	} {
		if (error instanceof ZodError) {
			const allMissingVars = error.issues
				.filter(
					(issue): issue is z.ZodIssue & { code: "invalid_type" } =>
						issue.code === "invalid_type" && issue.expected !== "undefined",
				)
				.map((issue) => issue.path?.[0])
				.filter((v): v is string => !!v);

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

	/**
	 * Handles import failure from esbuild or require()
	 */
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
					`Missing required environment variable${envCheck.requiredMissing?.length && envCheck.requiredMissing.length > 1 ? "s" : ""}: ${(envCheck.requiredMissing ?? envCheck.allMissing)?.join(", ")}`,
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
}
