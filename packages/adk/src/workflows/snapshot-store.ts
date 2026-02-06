import type { WorkflowSnapshot } from "./types";

export interface SnapshotStore {
	save(snapshot: WorkflowSnapshot): Promise<void>;
	load(workflowId: string, runId: string): Promise<WorkflowSnapshot | null>;
	delete(workflowId: string, runId: string): Promise<void>;
	list(workflowId: string): Promise<WorkflowSnapshot[]>;
}

export class InMemorySnapshotStore implements SnapshotStore {
	private snapshots: Map<string, WorkflowSnapshot> = new Map();

	private getKey(workflowId: string, runId: string): string {
		return `${workflowId}:${runId}`;
	}

	async save(snapshot: WorkflowSnapshot): Promise<void> {
		const key = this.getKey(snapshot.workflowId, snapshot.runId);
		this.snapshots.set(key, { ...snapshot, updatedAt: Date.now() });
	}

	async load(
		workflowId: string,
		runId: string,
	): Promise<WorkflowSnapshot | null> {
		const key = this.getKey(workflowId, runId);
		return this.snapshots.get(key) ?? null;
	}

	async delete(workflowId: string, runId: string): Promise<void> {
		const key = this.getKey(workflowId, runId);
		this.snapshots.delete(key);
	}

	async list(workflowId: string): Promise<WorkflowSnapshot[]> {
		const results: WorkflowSnapshot[] = [];
		for (const [key, snapshot] of this.snapshots) {
			if (key.startsWith(`${workflowId}:`)) {
				results.push(snapshot);
			}
		}
		return results;
	}

	clear(): void {
		this.snapshots.clear();
	}
}
