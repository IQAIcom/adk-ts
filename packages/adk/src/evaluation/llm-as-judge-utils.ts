import type { Content } from "@google/genai";
import { EvalStatus } from "./evaluator";

export enum Label {
	VALID = "valid",
	INVALID = "invalid",
	NOT_FOUND = "not_found",
}

export function getTextFromContent(content?: Content): string {
	if (content?.parts) {
		return content.parts
			.map((part) => part.text)
			.filter(Boolean)
			.join("\n");
	}
	return "";
}

export function getEvalStatus(score: number, threshold: number): EvalStatus {
	return score >= threshold ? EvalStatus.PASSED : EvalStatus.FAILED;
}

export function getMajorityEvalStatus(
	labels: Label[],
	threshold: number,
): EvalStatus {
	if (!labels.length) {
		return EvalStatus.NOT_EVALUATED;
	}

	const validCount = labels.filter((l) => l === Label.VALID).length;
	const score = validCount / labels.length;
	return getEvalStatus(score, threshold);
}
