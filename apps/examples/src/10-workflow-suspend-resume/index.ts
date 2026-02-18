import { z } from "zod";
import { createWorkflow, createStep, InMemorySnapshotStore } from "@iqai/adk";

const inputSchema = z.object({
	inputValue: z.number(),
});

const resumeSchema = z.object({ approved: z.boolean() });

const validateStep = createStep({
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

const processStep = createStep({
	id: "process",
	description: "Processes the data, but suspends for approval if value > 10",
	suspendSchema: z.object({ requiresApproval: z.boolean(), value: z.number() }),
	resumeSchema,
	execute: async ({ resumeData, suspend, getStepResult }) => {
		const validateResult = getStepResult<{ isValid: boolean; value: number }>(
			"validate",
		);
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

const finalizeStep = createStep({
	id: "finalize",
	description: "Finalizes the workflow result",
	execute: async ({ getStepResult }) => {
		const processResult = getStepResult<{
			processed: number;
			originalValue: number;
		}>("process");
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

export async function main() {
	console.log("🚀 Starting workflow with suspend/resume example...\n");

	const snapshotStore = new InMemorySnapshotStore();

	const workflow = createWorkflow({
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

	console.log("--- Example 1: Small value (no suspension) ---\n");
	const run1 = workflow.createRun();
	const result1 = await run1.start({ inputValue: 5 });
	console.log("\nResult:", JSON.stringify(result1, null, 2));
	console.log(`\nStatus: ${result1.status}\n`);

	console.log("\n--- Example 2: Large value (with suspension) ---\n");
	const run2 = workflow.createRun();
	const result2 = await run2.start({ inputValue: 25 });
	console.log("\nResult after start:", JSON.stringify(result2, null, 2));
	console.log(`\nStatus: ${result2.status}`);

	if (result2.status === "suspended") {
		console.log(`Suspended at step: ${result2.suspendedStep}`);
		console.log(`Suspend payload: ${JSON.stringify(result2.suspendPayload)}`);

		console.log("\n⏳ Simulating human approval...\n");
		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log("▶️ Resuming workflow with approval...\n");
		const resumedResult = await run2.resume({
			resumeData: { approved: true },
			step: result2.suspendedStep,
		});
		console.log("\nResumed result:", JSON.stringify(resumedResult, null, 2));
		console.log(`\nFinal status: ${resumedResult.status}`);
	}

	console.log("\n--- Example 3: Persistence and recovery ---\n");
	const run3 = workflow.createRun("persistent-run-123");
	const result3 = await run3.start({ inputValue: 50 });
	console.log(`Run ID: ${run3.runId}`);
	console.log(`Status after start: ${result3.status}`);

	if (result3.status === "suspended") {
		console.log("\n💾 Workflow state persisted. Simulating app restart...\n");
		await new Promise((resolve) => setTimeout(resolve, 500));

		const recoveredRun = await workflow.resumeRun("persistent-run-123");
		if (recoveredRun) {
			console.log(`📥 Recovered run: ${recoveredRun.runId}`);
			console.log(`   Status: ${recoveredRun.getStatus()}`);
			console.log(`   Suspended at: ${recoveredRun.getSuspendedStepId()}`);

			console.log("\n▶️ Resuming recovered workflow...\n");
			const finalResult = await recoveredRun.resume({
				resumeData: { approved: true },
			});
			console.log("\nFinal result:", JSON.stringify(finalResult, null, 2));
		}
	}

	console.log("\n✨ All examples completed!");
}

main().catch(console.error);
