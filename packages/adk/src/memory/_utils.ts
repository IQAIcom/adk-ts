/**
 * Formats a timestamp for memory entries
 */
export function formatTimestamp(timestamp: Date | string | number): string {
	if (timestamp instanceof Date) {
		return timestamp.toISOString();
	}
	if (typeof timestamp === "string") {
		return timestamp;
	}
	if (typeof timestamp === "number") {
		return new Date(timestamp).toISOString();
	}
	return new Date().toISOString();
}
