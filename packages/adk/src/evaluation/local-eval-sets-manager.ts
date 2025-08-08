import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { EvalCase } from "./eval-case";
import type { EvalSet } from "./eval-set";
import type { EvalSetsManager } from "./eval-sets-manager";
import {
	getEvalSetFromAppAndId,
	getEvalCaseFromEvalSet,
	addEvalCaseToEvalSet,
	updateEvalCaseInEvalSet,
	deleteEvalCaseFromEvalSet,
} from "./eval-sets-manager-utils";

export class LocalEvalSetsManager implements EvalSetsManager {
	private readonly basePath: string;

	constructor(basePath: string) {
		this.basePath = basePath;
	}

	private getEvalSetsPath(appName: string): string {
		return path.join(this.basePath, appName, "eval_sets");
	}

	private getEvalSetPath(appName: string, evalSetId: string): string {
		return path.join(this.getEvalSetsPath(appName), `${evalSetId}.json`);
	}

	async listEvalSets(appName: string): Promise<EvalSet[]> {
		const evalSetsPath = this.getEvalSetsPath(appName);

		try {
			await fs.mkdir(evalSetsPath, { recursive: true });
			const files = await fs.readdir(evalSetsPath);
			const evalSets: EvalSet[] = [];

			for (const file of files) {
				if (!file.endsWith(".json")) continue;
				const evalSetPath = path.join(evalSetsPath, file);
				const content = await fs.readFile(evalSetPath, "utf-8");
				evalSets.push(JSON.parse(content));
			}

			return evalSets;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return [];
			}
			throw error;
		}
	}

	async getEvalSet(
		appName: string,
		evalSetId: string,
	): Promise<EvalSet | undefined> {
		const evalSetPath = this.getEvalSetPath(appName, evalSetId);

		try {
			const content = await fs.readFile(evalSetPath, "utf-8");
			return JSON.parse(content);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return undefined;
			}
			throw error;
		}
	}

	async createEvalSet(appName: string, evalSet: EvalSet): Promise<EvalSet> {
		const evalSetsPath = this.getEvalSetsPath(appName);
		const evalSetPath = this.getEvalSetPath(appName, evalSet.evalSetId);

		const existing = await this.getEvalSet(appName, evalSet.evalSetId);
		if (existing) {
			throw new Error(
				`Eval set \`${evalSet.evalSetId}\` already exists for app \`${appName}\`.`,
			);
		}

		await fs.mkdir(evalSetsPath, { recursive: true });
		await fs.writeFile(evalSetPath, JSON.stringify(evalSet, null, 2));
		return evalSet;
	}

	async updateEvalSet(appName: string, evalSet: EvalSet): Promise<EvalSet> {
		const evalSetPath = this.getEvalSetPath(appName, evalSet.evalSetId);

		await getEvalSetFromAppAndId(this, appName, evalSet.evalSetId);

		await fs.writeFile(evalSetPath, JSON.stringify(evalSet, null, 2));
		return evalSet;
	}

	async deleteEvalSet(appName: string, evalSetId: string): Promise<void> {
		const evalSetPath = this.getEvalSetPath(appName, evalSetId);

		try {
			await fs.unlink(evalSetPath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				throw new Error(
					`Eval set \`${evalSetId}\` not found for app \`${appName}\`.`,
				);
			}
			throw error;
		}
	}

	async getEvalCase(
		appName: string,
		evalSetId: string,
		evalCaseId: string,
	): Promise<EvalCase | undefined> {
		const evalSet = await getEvalSetFromAppAndId(this, appName, evalSetId);
		return getEvalCaseFromEvalSet(evalSet, evalCaseId);
	}

	async createEvalCase(
		appName: string,
		evalSetId: string,
		evalCase: EvalCase,
	): Promise<EvalCase> {
		let evalSet = await getEvalSetFromAppAndId(this, appName, evalSetId);
		evalSet = addEvalCaseToEvalSet(evalSet, evalCase);
		await this.updateEvalSet(appName, evalSet);
		return evalCase;
	}

	async updateEvalCase(
		appName: string,
		evalSetId: string,
		evalCase: EvalCase,
	): Promise<EvalCase> {
		let evalSet = await getEvalSetFromAppAndId(this, appName, evalSetId);
		evalSet = updateEvalCaseInEvalSet(evalSet, evalCase);
		await this.updateEvalSet(appName, evalSet);
		return evalCase;
	}

	async deleteEvalCase(
		appName: string,
		evalSetId: string,
		evalCaseId: string,
	): Promise<void> {
		let evalSet = await getEvalSetFromAppAndId(this, appName, evalSetId);
		evalSet = deleteEvalCaseFromEvalSet(evalSet, evalCaseId);
		await this.updateEvalSet(appName, evalSet);
	}
}
