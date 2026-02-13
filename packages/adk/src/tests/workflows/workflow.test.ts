import { describe, expect, it, beforeEach } from "vitest";
import {
	createWorkflow,
	createStep,
	InMemorySnapshotStore,
} from "../../workflows";

describe("Workflow with suspend/resume", () => {
	describe("createStep", () => {
		it("should create a step with the given definition", () => {
			const step = createStep({
				id: "test-step",
				description: "A test step",
				execute: async () => ({ result: "success" }),
			});

			expect(step.id).toBe("test-step");
			expect(step.description).toBe("A test step");
		});
	});

	describe("Workflow", () => {
		it("should execute a simple workflow without suspension", async () => {
			const step1 = createStep({
				id: "step1",
				execute: async () => ({ value: 1 }),
			});

			const step2 = createStep({
				id: "step2",
				execute: async ({ getStepResult }) => {
					const prev = getStepResult<{ value: number }>("step1");
					return { value: (prev?.value ?? 0) + 1 };
				},
			});

			const workflow = createWorkflow({ id: "simple-workflow" })
				.step(step1)
				.step(step2)
				.commit();

			const run = workflow.createRun();
			const result = await run.start({});

			expect(result.status).toBe("success");
			if (result.status === "success") {
				expect(result.result).toEqual({ value: 2 });
			}
		});

		it("should suspend and resume a workflow", async () => {
			const step1 = createStep({
				id: "validate",
				execute: async ({ inputData }) => {
					const data = inputData as { value: number };
					return { validated: true, value: data.value };
				},
			});

			const step2 = createStep({
				id: "process",
				execute: async ({ resumeData, suspend, getStepResult }) => {
					const prev = getStepResult<{ validated: boolean; value: number }>(
						"validate",
					);
					if (!prev?.validated) {
						throw new Error("Validation failed");
					}

					if (!resumeData) {
						suspend({ needsApproval: true });
					}

					const resume = resumeData as { approved: boolean };
					return { processed: true, approved: resume.approved };
				},
			});

			const workflow = createWorkflow({ id: "suspend-workflow" })
				.step(step1)
				.step(step2)
				.commit();

			const run = workflow.createRun();
			const result1 = await run.start({ value: 10 });

			expect(result1.status).toBe("suspended");
			if (result1.status === "suspended") {
				expect(result1.suspendedStep).toBe("process");
				expect(result1.suspendPayload).toEqual({ needsApproval: true });
			}

			const result2 = await run.resume({
				resumeData: { approved: true },
				step: "process",
			});

			expect(result2.status).toBe("success");
			if (result2.status === "success") {
				expect(result2.result).toEqual({ processed: true, approved: true });
			}
		});

		it("should persist and recover workflow state", async () => {
			const snapshotStore = new InMemorySnapshotStore();

			const step = createStep({
				id: "suspend-step",
				execute: async ({ resumeData, suspend }) => {
					if (!resumeData) {
						suspend({ waiting: true });
					}
					return { done: true };
				},
			});

			const workflow = createWorkflow({ id: "persist-workflow" })
				.step(step)
				.withSnapshotStore(snapshotStore)
				.commit();

			const run = workflow.createRun("test-run-id");
			await run.start({});

			expect(run.getStatus()).toBe("suspended");

			const recoveredRun = await workflow.resumeRun("test-run-id");
			expect(recoveredRun).not.toBeNull();
			expect(recoveredRun?.runId).toBe("test-run-id");
			expect(recoveredRun?.getStatus()).toBe("suspended");

			const result = await recoveredRun!.resume({
				resumeData: { continue: true },
			});

			expect(result.status).toBe("success");
		});

		it("should handle errors in steps", async () => {
			const failingStep = createStep({
				id: "failing-step",
				execute: async () => {
					throw new Error("Step failed");
				},
			});

			const workflow = createWorkflow({ id: "fail-workflow" })
				.step(failingStep)
				.commit();

			const run = workflow.createRun();
			const result = await run.start({});

			expect(result.status).toBe("failed");
			if (result.status === "failed") {
				expect(result.error.message).toBe("Step failed");
			}
		});

		it("should throw if workflow is not committed", () => {
			const workflow = createWorkflow({ id: "uncommitted" });

			expect(() => workflow.createRun()).toThrow(
				"Workflow must be committed before creating a run",
			);
		});

		it("should throw if workflow has no steps", () => {
			const workflow = createWorkflow({ id: "empty" });

			expect(() => workflow.commit()).toThrow(
				"Workflow must have at least one step",
			);
		});
	});

	describe("InMemorySnapshotStore", () => {
		let store: InMemorySnapshotStore;

		beforeEach(() => {
			store = new InMemorySnapshotStore();
		});

		it("should save and load snapshots", async () => {
			const snapshot = {
				runId: "run-1",
				workflowId: "wf-1",
				status: "suspended" as const,
				input: { value: 1 },
				stepResults: {},
				suspendedStepId: "step-1",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			await store.save(snapshot);
			const loaded = await store.load("wf-1", "run-1");

			expect(loaded).not.toBeNull();
			expect(loaded?.runId).toBe("run-1");
			expect(loaded?.status).toBe("suspended");
		});

		it("should return null for non-existent snapshots", async () => {
			const loaded = await store.load("non-existent", "run-id");
			expect(loaded).toBeNull();
		});

		it("should delete snapshots", async () => {
			const snapshot = {
				runId: "run-1",
				workflowId: "wf-1",
				status: "suspended" as const,
				input: {},
				stepResults: {},
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			await store.save(snapshot);
			await store.delete("wf-1", "run-1");
			const loaded = await store.load("wf-1", "run-1");

			expect(loaded).toBeNull();
		});

		it("should list snapshots for a workflow", async () => {
			const snapshot1 = {
				runId: "run-1",
				workflowId: "wf-1",
				status: "suspended" as const,
				input: {},
				stepResults: {},
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			const snapshot2 = {
				runId: "run-2",
				workflowId: "wf-1",
				status: "success" as const,
				input: {},
				stepResults: {},
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			await store.save(snapshot1);
			await store.save(snapshot2);

			const list = await store.list("wf-1");
			expect(list.length).toBe(2);
		});
	});
});
