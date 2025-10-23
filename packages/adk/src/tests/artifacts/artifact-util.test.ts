import { describe, expect, it } from "vitest";
import {
	getArtifactUri,
	isArtifactRef,
	parseArtifactUri,
} from "../../artifacts/artifact-util";

describe("parseArtifactUri", () => {
	it("should parse a valid session-scoped artifact URI", () => {
		const uri =
			"artifact://apps/app1/users/user1/sessions/session1/artifacts/file1/versions/123";
		const parsed = parseArtifactUri(uri);
		expect(parsed).not.toBeNull();
		expect(parsed?.appName).toBe("app1");
		expect(parsed?.userId).toBe("user1");
		expect(parsed?.sessionId).toBe("session1");
		expect(parsed?.filename).toBe("file1");
		expect(parsed?.version).toBe(123);
	});

	it("should parse a valid user-scoped artifact URI", () => {
		const uri = "artifact://apps/app2/users/user2/artifacts/file2/versions/456";
		const parsed = parseArtifactUri(uri);
		expect(parsed).not.toBeNull();
		expect(parsed?.appName).toBe("app2");
		expect(parsed?.userId).toBe("user2");
		expect(parsed?.sessionId).toBeUndefined();
		expect(parsed?.filename).toBe("file2");
		expect(parsed?.version).toBe(456);
	});

	it("should return null for invalid URIs", () => {
		const invalidUris = [
			"http://example.com",
			"artifact://invalid",
			"artifact://app1/user1/sessions/session1/artifacts/file1",
			"artifact://apps/app1/users/user1/sessions/session1/artifacts/file1",
			"artifact://apps/app1/users/user1/artifacts/file1",
		];

		for (const uri of invalidUris) {
			expect(parseArtifactUri(uri)).toBeNull();
		}
	});
});

describe("getArtifactUri", () => {
	it("should construct a session-scoped artifact URI", () => {
		const uri = getArtifactUri({
			appName: "app1",
			userId: "user1",
			sessionId: "session1",
			filename: "file1",
			version: 123,
		});
		expect(uri).toBe(
			"artifact://apps/app1/users/user1/sessions/session1/artifacts/file1/versions/123",
		);
	});

	it("should construct a user-scoped artifact URI", () => {
		const uri = getArtifactUri({
			appName: "app2",
			userId: "user2",
			filename: "file2",
			version: 456,
		});
		expect(uri).toBe(
			"artifact://apps/app2/users/user2/artifacts/file2/versions/456",
		);
	});
});

describe("isArtifactRef", () => {
	it("should return true for a valid artifact reference", () => {
		const artifact = {
			fileData: {
				fileUri: "artifact://apps/a/users/u/sessions/s/artifacts/f/versions/1",
				mimeType: "text/plain",
			},
		};
		expect(isArtifactRef(artifact)).toBe(true);
	});

	it("should return false for non-reference parts", () => {
		const nonRefParts = [
			{ text: "hello" },
			{
				inlineData: { data: "AQID", mimeType: "text/plain" },
			},
			{
				fileData: {
					fileUri: "http://example.com",
					mimeType: "text/plain",
				},
			},
			{},
		];

		for (const part of nonRefParts) {
			expect(isArtifactRef(part)).toBe(false);
		}
	});
});
