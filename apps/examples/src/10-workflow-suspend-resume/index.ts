import dedent from "dedent";
import { getWorkflow } from "./agents/workflows";

/**
 * 10. Workflow Suspend and Resume
 *
 * This example demonstrates the advanced workflow capabilities of ADK-TS, specifically
 * how to handle steps that require human intervention or long-running tasks.
 *
 * In this example, you will learn:
 * 1. How to define workflow steps with input, output, and suspend schemas.
 * 2. How to use `suspend()` to pause workflow execution and `resume()` to continue it.
 * 3. How to use an `InMemorySnapshotStore` for basic state persistence.
 * 4. How to recover and resume a workflow run by its ID.
 *
 * This pattern is essential for build-and-approve loops, human-in-the-loop agents,
 * and resilient processing pipelines.
 */
async function main() {
	const workflow = getWorkflow();

	console.log(dedent`
		🚀 Starting workflow with suspend/resume example...
	`);

	// --- Example 1: Small value (no suspension) ---
	console.log(dedent`
		\n\n--- Example 1: Small value (no suspension) ---\n
	`);
	const run1 = workflow.createRun();
	const result1 = await run1.start({ inputValue: 5 });

	console.log(dedent`
		🏁 Result: ${JSON.stringify(result1, null, 2)}
		📊 Status: ${result1.status}
	`);

	// --- Example 2: Large value (with suspension) ---
	console.log(dedent`
		\n\n--- Example 2: Large value (with suspension) ---\n
	`);
	const run2 = workflow.createRun();
	const result2 = await run2.start({ inputValue: 25 });

	console.log(dedent`
		⏸️ Status after start: ${result2.status}
	`);

	if (result2.status === "suspended") {
		console.log(dedent`
			📍 Suspended at step: ${result2.suspendedStep}
			📦 Suspend payload:  ${JSON.stringify(result2.suspendPayload)}
			
			⏳ Simulating human approval...
		`);

		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log(dedent`
			▶️ Resuming workflow with approval...
		`);

		const resumedResult = await run2.resume({
			resumeData: { approved: true },
			step: result2.suspendedStep,
		});

		console.log(dedent`
			🏁 Resumed result: ${JSON.stringify(resumedResult, null, 2)}
			📊 Final status:  ${resumedResult.status}
		`);
	}

	// --- Example 3: Persistence and recovery ---
	console.log(dedent`
		\n\n--- Example 3: Persistence and recovery ---\n
	`);
	const runId = "persistent-run-123";
	const run3 = workflow.createRun(runId);
	const result3 = await run3.start({ inputValue: 50 });

	console.log(dedent`
		🆔 Run ID: ${run3.runId}
		📊 Status after start: ${result3.status}
	`);

	if (result3.status === "suspended") {
		console.log(dedent`
			💾 Workflow state persisted. Simulating app restart...
		`);

		await new Promise((resolve) => setTimeout(resolve, 500));

		const recoveredRun = await workflow.resumeRun(runId);
		if (recoveredRun) {
			console.log(dedent`
				📥 Recovered run: ${recoveredRun.runId}
				📈 Status:       ${recoveredRun.getStatus()}
				📍 Suspended at: ${recoveredRun.getSuspendedStepId()}
				
				▶️ Resuming recovered workflow...
			`);

			const finalResult = await recoveredRun.resume({
				resumeData: { approved: true },
			});

			console.log(dedent`
				🏁 Final result: ${JSON.stringify(finalResult, null, 2)}
			`);
		}
	}

	console.log(dedent`
		✨ All examples completed!
	`);
}

main().catch(console.error);
