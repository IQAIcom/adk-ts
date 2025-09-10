import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Content } from "@google/genai";
import type { BaseAgent } from "../agents/base-agent";
import type { EvalCase, IntermediateData, Invocation } from "./eval-case";
import {
	type EvalMetric,
	type EvalMetricResult,
	PrebuiltMetrics,
} from "./eval-metrics";
import type { EvalCaseResult } from "./eval-result";
import type { EvalSet } from "./eval-set";
import { EvalStatus } from "./evaluator";
import { LocalEvalService } from "./local-eval-service";

export const NUM_RUNS = 2;

export const TOOL_TRAJECTORY_SCORE_KEY =
	PrebuiltMetrics.TOOL_TRAJECTORY_AVG_SCORE;
export const RESPONSE_EVALUATION_SCORE_KEY =
	PrebuiltMetrics.RESPONSE_EVALUATION_SCORE;
export const RESPONSE_MATCH_SCORE_KEY = PrebuiltMetrics.RESPONSE_MATCH_SCORE;
export const SAFETY_V1_KEY = PrebuiltMetrics.SAFETY_V1;

export const ALLOWED_CRITERIA = [
	TOOL_TRAJECTORY_SCORE_KEY,
	RESPONSE_EVALUATION_SCORE_KEY,
	RESPONSE_MATCH_SCORE_KEY,
	SAFETY_V1_KEY,
];

export const QUERY_COLUMN = "query";
export const REFERENCE_COLUMN = "reference";
export const EXPECTED_TOOL_USE_COLUMN = "expected_tool_use";

export const DEFAULT_CRITERIA: Partial<Record<PrebuiltMetrics, number>> = {
	[TOOL_TRAJECTORY_SCORE_KEY]: 1.0,
	[RESPONSE_MATCH_SCORE_KEY]: 0.8,
} as const;

export const loadJson = async (
	filePath: string,
): Promise<Record<string, any> | any[]> => {
	try {
		const fileContent = await fs.readFile(filePath, "utf-8");
		return JSON.parse(fileContent);
	} catch (error) {
		throw new Error(`Failed to load JSON from ${filePath}: ${error}`);
	}
};

interface EvalMetricResultWithInvocation {
	actualInvocation: Invocation;
	expectedInvocation: Invocation;
	evalMetricResult: EvalMetricResult;
}

export class AgentEvaluator {
	static async findConfigForTestFile(
		testFile: string,
	): Promise<Record<string, number>> {
		const testFolder = path.dirname(testFile);
		const configPath = path.join(testFolder, "test_config.json");

		try {
			await fs.access(configPath);
			const configData = (await loadJson(configPath)) as Record<string, any>;

			if ("criteria" in configData && typeof configData.criteria === "object") {
				return configData.criteria as Record<string, number>;
			}
			throw new Error(
				`Invalid format for test_config.json at ${configPath}. Expected a 'criteria' dictionary.`,
			);
		} catch (error) {
			return DEFAULT_CRITERIA as Record<string, number>;
		}
	}

	static async evaluateEvalSet(
		agent: BaseAgent,
		evalSet: EvalSet,
		criteria: Record<string, number>,
		numRuns: number = NUM_RUNS,
		printDetailedResults = false,
	): Promise<void> {
		const evalMetrics = Object.entries(criteria).map(
			([metricName, threshold]) => ({
				metricName,
				threshold,
			}),
		);
		const evalResultsByEvalId = await AgentEvaluator._getEvalResultsByEvalId(
			agent,
			evalSet,
			evalMetrics,
			numRuns,
		);
		const failures: string[] = [];

		for (const [_, evalResultsPerEvalId] of evalResultsByEvalId) {
			const evalMetricResults =
				AgentEvaluator._getEvalMetricResultsWithInvocation(
					evalResultsPerEvalId,
				);

			const failuresPerEvalCase = AgentEvaluator._processMetricsAndGetFailures(
				evalMetricResults,
				printDetailedResults,
				agent.name || "Unknown Agent",
			);

			failures.push(...failuresPerEvalCase);
		}

		if (failures.length > 0) {
			throw new Error(
				`Following are all the test failures. If you looking to get more details on the failures, then please re-run this test with \`printDetailedResults\` set to \`true\`.\n${failures.join(
					"\n",
				)}`,
			);
		}
	}

	static async evaluate(
		agent: BaseAgent,
		evalDatasetFilePathOrDir: string,
		numRuns: number = NUM_RUNS,
		initialSessionFile?: string,
	): Promise<void> {
		const testFiles: string[] = [];

		try {
			const stat = await fs.stat(evalDatasetFilePathOrDir);
			if (stat.isDirectory()) {
				const files = await this._findTestFilesRecursively(
					evalDatasetFilePathOrDir,
				);
				testFiles.push(...files);
			} else {
				testFiles.push(evalDatasetFilePathOrDir);
			}
		} catch (error) {
			throw new Error(`Invalid path: ${evalDatasetFilePathOrDir}`);
		}

		const initialSession =
			await AgentEvaluator._getInitialSession(initialSessionFile);

		for (const testFile of testFiles) {
			const criteria = await AgentEvaluator.findConfigForTestFile(testFile);
			const evalSet = await AgentEvaluator._loadEvalSetFromFile(
				testFile,
				criteria,
				initialSession,
			);

			await AgentEvaluator.evaluateEvalSet(agent, evalSet, criteria, numRuns);
		}
	}

	static async migrateEvalDataToNewSchema(
		oldEvalDataFile: string,
		newEvalDataFile: string,
		initialSessionFile?: string,
	): Promise<void> {
		if (!oldEvalDataFile || !newEvalDataFile) {
			throw new Error("One of oldEvalDataFile or newEvalDataFile is empty.");
		}

		const criteria =
			await AgentEvaluator.findConfigForTestFile(oldEvalDataFile);
		const initialSession =
			await AgentEvaluator._getInitialSession(initialSessionFile);

		const evalSet = await AgentEvaluator._getEvalSetFromOldFormat(
			oldEvalDataFile,
			criteria,
			initialSession,
		);

		await fs.writeFile(newEvalDataFile, JSON.stringify(evalSet, null, 2));
	}

	private static async _findTestFilesRecursively(
		dir: string,
	): Promise<string[]> {
		const testFiles: string[] = [];

		async function walk(currentDir: string) {
			const entries = await fs.readdir(currentDir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(currentDir, entry.name);
				if (entry.isDirectory()) {
					await walk(fullPath);
				} else if (entry.name.endsWith(".test.json")) {
					testFiles.push(fullPath);
				}
			}
		}

		await walk(dir);
		return testFiles;
	}

	private static async _loadEvalSetFromFile(
		evalSetFile: string,
		criteria: Record<string, number>,
		initialSession: Record<string, any>,
	): Promise<EvalSet> {
		try {
			const content = await fs.readFile(evalSetFile, "utf-8");

			try {
				const evalSet = JSON.parse(content) as EvalSet;

				if (evalSet.evalSetId && evalSet.evalCases) {
					if (Object.keys(initialSession).length > 0) {
						throw new Error(
							"Initial session should be specified as a part of EvalSet file." +
								" Explicit initial session is only needed, when specifying data in" +
								" the older schema.",
						);
					}
					return evalSet;
				}
			} catch (parseError) {
				throw new Error(`Failed to parse eval set data: ${parseError}`);
			}
		} catch (error) {
			throw new Error(`Failed to process eval set file: ${error}`);
		}

		console.warn(
			`Contents of ${evalSetFile} appear to be in older format. To avoid this warning, please update your test files to contain data in EvalSet schema. You can use 'migrateEvalDataToNewSchema' for migrating your old test files.`,
		);

		return AgentEvaluator._getEvalSetFromOldFormat(
			evalSetFile,
			criteria,
			initialSession,
		);
	}

	private static async _getEvalSetFromOldFormat(
		evalSetFile: string,
		criteria: Record<string, number>,
		initialSession: Record<string, any>,
	): Promise<EvalSet> {
		const data = await AgentEvaluator._loadDataset(evalSetFile);
		AgentEvaluator._validateInput(data, criteria);

		return {
			evalSetId: `eval-set-${Date.now()}`,
			name: evalSetFile,
			evalCases: data[0].map(
				(item: any, index: number) =>
					({
						evalId: `eval-${index}`,
						conversation: [
							{
								invocationId: `invocation-${index}`,
								userContent: {
									role: "user",
									parts: [{ text: item[QUERY_COLUMN] || "" }],
								},
								finalResponse: item[REFERENCE_COLUMN]
									? {
											role: "model",
											parts: [{ text: item[REFERENCE_COLUMN] }],
										}
									: undefined,
								intermediateData: item[EXPECTED_TOOL_USE_COLUMN]
									? {
											toolUses: item[EXPECTED_TOOL_USE_COLUMN],
											intermediateResponses: [],
										}
									: undefined,
								creationTimestamp: Date.now(),
							},
						],
						sessionInput:
							Object.keys(initialSession).length > 0
								? {
										appName: "test-app",
										userId: "test-user",
										state: initialSession,
									}
								: undefined,
					}) as EvalCase,
			),
			creationTimestamp: Date.now(),
		};
	}

	private static async _getInitialSession(
		initialSessionFile?: string,
	): Promise<Record<string, any>> {
		if (!initialSessionFile) {
			return {};
		}

		try {
			const content = await fs.readFile(initialSessionFile, "utf-8");
			return JSON.parse(content);
		} catch (error) {
			throw new Error(
				`Failed to load initial session from ${initialSessionFile}: ${error}`,
			);
		}
	}

	private static async _loadDataset(inputData: string): Promise<any[][]> {
		const stat = await fs.stat(inputData);

		if (stat.isDirectory()) {
			const testFiles = await this._findTestFilesRecursively(inputData);
			const results = await Promise.all(testFiles.map((f) => loadJson(f)));
			return results.map((r) => (Array.isArray(r) ? r : [r]));
		}
		if (stat.isFile()) {
			const data = await loadJson(inputData);
			return [Array.isArray(data) ? data : [data]];
		}
		throw new Error(`Invalid input path: ${inputData}`);
	}

	private static _validateInput(
		evalDataset: any[][],
		criteria: Record<string, number>,
	): void {
		if (!evalDataset || evalDataset.length === 0) {
			throw new Error("The evaluation dataset is None or empty.");
		}

		for (const key of Object.keys(criteria)) {
			if (!ALLOWED_CRITERIA.includes(key as PrebuiltMetrics)) {
				throw new Error(
					`Invalid criteria key: ${key}. Expected one of ${ALLOWED_CRITERIA.join(
						", ",
					)}.`,
				);
			}
		}

		const sample = evalDataset[0];
		if (!Array.isArray(sample) || sample.length === 0) {
			throw new Error("The evaluation dataset is empty.");
		}

		const firstQuery = sample[0];
		if (typeof firstQuery !== "object") {
			throw new Error(
				`Each evaluation dataset sample must be list of dictionary. But it's ${JSON.stringify(
					evalDataset,
				)}`,
			);
		}

		if (TOOL_TRAJECTORY_SCORE_KEY in criteria) {
			if (
				!(QUERY_COLUMN in firstQuery) ||
				!(EXPECTED_TOOL_USE_COLUMN in firstQuery)
			) {
				throw new Error(
					`Samples for ${TOOL_TRAJECTORY_SCORE_KEY} must include` +
						` '${QUERY_COLUMN}' and '${EXPECTED_TOOL_USE_COLUMN}' keys. The` +
						` sample is ${JSON.stringify(sample)}.`,
				);
			}
		}

		if (RESPONSE_EVALUATION_SCORE_KEY in criteria) {
			if (!(QUERY_COLUMN in firstQuery)) {
				throw new Error(
					`Samples for ${RESPONSE_EVALUATION_SCORE_KEY} must include` +
						` '${QUERY_COLUMN}' key. The sample is ${JSON.stringify(sample)}.`,
				);
			}
		}

		if (RESPONSE_MATCH_SCORE_KEY in criteria) {
			if (!(QUERY_COLUMN in firstQuery) || !(REFERENCE_COLUMN in firstQuery)) {
				throw new Error(
					`Samples for ${RESPONSE_MATCH_SCORE_KEY} must include` +
						` '${QUERY_COLUMN}' and '${REFERENCE_COLUMN}' keys. The sample is` +
						` ${JSON.stringify(sample)}.`,
				);
			}
		}
	}

	private static _printDetails(
		evalMetricResultWithInvocations: EvalMetricResultWithInvocation[],
		overallEvalStatus: EvalStatus,
		overallScore?: number,
		metricName = "",
		threshold = 0,
	): void {
		console.log(
			`Summary: \`${overallEvalStatus}\` for Metric:` +
				` \`${metricName}\`. Expected threshold: \`${threshold}\`, actual value:` +
				` \`${overallScore}\`.`,
		);

		const data = evalMetricResultWithInvocations.map((per) => ({
			evalStatus: per.evalMetricResult.evalStatus,
			score: per.evalMetricResult.score,
			threshold: threshold,
			prompt: AgentEvaluator._convertContentToText(
				per.expectedInvocation.userContent,
			),
			expectedResponse: AgentEvaluator._convertContentToText(
				per.expectedInvocation.finalResponse,
			),
			actualResponse: AgentEvaluator._convertContentToText(
				per.actualInvocation.finalResponse,
			),
			expectedToolCalls: AgentEvaluator._convertToolCallsToText(
				per.expectedInvocation.intermediateData,
			),
			actualToolCalls: AgentEvaluator._convertToolCallsToText(
				per.actualInvocation.intermediateData,
			),
		}));

		console.table(data);
		console.log("\n\n");
	}

	private static _convertContentToText(content?: Content): string {
		if (content?.parts) {
			return content.parts
				.map((p) => p.text || "")
				.filter((text) => text.length > 0)
				.join("\n");
		}
		return "";
	}

	private static _convertToolCallsToText(
		intermediateData?: IntermediateData,
	): string {
		if (intermediateData?.toolUses) {
			return intermediateData.toolUses.map((t) => JSON.stringify(t)).join("\n");
		}
		return "";
	}

	private static async _getEvalResultsByEvalId(
		agent: BaseAgent,
		evalSet: EvalSet,
		evalMetrics: EvalMetric[],
		numRuns: number,
	): Promise<Map<string, EvalCaseResult[]>> {
		const evalService = new LocalEvalService(agent);

		const inferenceResults: Invocation[][] = [];
		for (let run = 0; run < numRuns; run++) {
			for await (const result of evalService.performInference({
				evalSetId: evalSet.evalSetId,
				evalCases: [evalSet],
			})) {
				inferenceResults.push(result);
			}
		}

		const evalResultsByEvalId = new Map<string, EvalCaseResult[]>();
		for await (const evalResult of evalService.evaluate({
			inferenceResults,
			evaluateConfig: { evalMetrics },
		})) {
			for (const caseResult of evalResult.evalCaseResults) {
				const evalId = caseResult.evalId;
				if (!evalResultsByEvalId.has(evalId)) {
					evalResultsByEvalId.set(evalId, []);
				}
				evalResultsByEvalId.get(evalId)!.push(caseResult);
			}
		}

		return evalResultsByEvalId;
	}

	private static _getEvalMetricResultsWithInvocation(
		evalResultsPerEvalId: EvalCaseResult[],
	): Record<string, EvalMetricResultWithInvocation[]> {
		const evalMetricResults: Record<string, EvalMetricResultWithInvocation[]> =
			{};

		for (const evalCaseResult of evalResultsPerEvalId) {
			for (const evalMetricsPerInvocation of evalCaseResult.evalMetricResultPerInvocation) {
				for (const evalMetricResult of evalMetricsPerInvocation.evalMetricResults) {
					const metricName = evalMetricResult.metricName;
					if (!(metricName in evalMetricResults)) {
						evalMetricResults[metricName] = [];
					}

					evalMetricResults[metricName].push({
						actualInvocation: evalMetricsPerInvocation.actualInvocation,
						expectedInvocation: evalMetricsPerInvocation.expectedInvocation,
						evalMetricResult: evalMetricResult,
					});
				}
			}
		}

		return evalMetricResults;
	}

	private static _processMetricsAndGetFailures(
		evalMetricResults: Record<string, EvalMetricResultWithInvocation[]>,
		printDetailedResults: boolean,
		agentModule: string,
	): string[] {
		const failures: string[] = [];

		for (const [metricName, evalMetricResultsWithInvocations] of Object.entries(
			evalMetricResults,
		)) {
			const threshold =
				evalMetricResultsWithInvocations[0]?.evalMetricResult.threshold || 0;
			const scores = evalMetricResultsWithInvocations
				.map((m) => m.evalMetricResult.score)
				.filter((s): s is number => s !== undefined);

			let overallScore: number | undefined;
			let overallEvalStatus: EvalStatus;

			if (scores.length > 0) {
				overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
				overallEvalStatus =
					overallScore >= threshold ? EvalStatus.PASSED : EvalStatus.FAILED;
			} else {
				overallScore = undefined;
				overallEvalStatus = EvalStatus.NOT_EVALUATED;
			}

			if (overallEvalStatus !== EvalStatus.PASSED) {
				if (printDetailedResults) {
					AgentEvaluator._printDetails(
						evalMetricResultsWithInvocations,
						overallEvalStatus,
						overallScore,
						metricName,
						threshold,
					);
				}
				failures.push(
					`${metricName} for ${agentModule} Failed. Expected ${threshold},` +
						` but got ${overallScore}.`,
				);
			}
		}

		return failures;
	}
}
