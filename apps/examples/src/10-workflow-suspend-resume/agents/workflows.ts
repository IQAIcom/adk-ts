import { z } from "zod";
import { createWorkflow, createStep, InMemorySnapshotStore } from "@iqai/adk";

export const inputSchema = z.object({
	inputValue: z.number(),
});

export const resumeSchema = z.object({ approved: z.boolean() });

export const validateStep = createStep({
	id: "validate",
	description: "Validates the input data",
	inputSchema: inputSchema,
	outputSchema: z.object({ isValid: z.boolean(), value: z.number() }),
	execute: async ({ inputData }) => {
		const data = inputSchema.parse(inputData);
		console.log(`📋 Validating input: ${data.inputValue}`);

		const isValid = data.inputValue > 0;
		return { isValid, value: data.inputValue };
	},
});

export const processStep = createStep({
	id: "process",
	description: "Processes the data, but suspends for approval if value > 10",
	suspendSchema: z.object({ requiresApproval: z.boolean(), value: z.number() }),
	resumeSchema,
	execute: async ({
		resumeData,
		suspend,
		getStepResult,
	}: {
		resumeData?: z.infer<typeof resumeSchema>;
		suspend: (data: any) => void;
		getStepResult: (id: string) => any;
	}) => {
		const validateResult = getStepResult("validate") as
			| {
					isValid: boolean;
					value: number;
			  }
			| undefined;
		if (!validateResult?.isValid) {
			throw new Error("Validation failed");
		}

		const value = validateResult.value;
		console.log(`⚙️ Processing value: ${value}`);

		if (value > 10 && !resumeData) {
			console.log("⏸️ Value > 10, suspending for approval...");
			suspend({ requiresApproval: true, value });
		}

		if (resumeData) {
			const resume = resumeSchema.parse(resumeData);
			console.log(`▶️ Resumed with approval: ${resume.approved}`);
			if (!resume.approved) {
				throw new Error("Processing not approved");
			}
		}

		const processed = value * 2;
		console.log(`✅ Processed result: ${processed}`);
		return { processed, originalValue: value };
	},
});

export const finalizeStep = createStep({
	id: "finalize",
	description: "Finalizes the workflow result",
	execute: async ({ getStepResult }) => {
		const processResult = getStepResult("process") as
			| {
					processed: number;
					originalValue: number;
			  }
			| undefined;
		if (!processResult) {
			throw new Error("Process step result not found");
		}

		const finalResult = {
			status: "completed" as const,
			originalValue: processResult.originalValue,
			processedValue: processResult.processed,
			timestamp: new Date().toISOString(),
		};

		console.log("🎉 Workflow completed:", finalResult);
		return finalResult;
	},
});

export function getWorkflow() {
	const snapshotStore = new InMemorySnapshotStore();

	return createWorkflow({
		id: "data-processing-workflow",
		description:
			"A workflow that processes data with approval for large values",
		inputSchema,
	})
		.step(validateStep)
		.step(processStep)
		.step(finalizeStep)
		.withSnapshotStore(snapshotStore)
		.commit();
}
