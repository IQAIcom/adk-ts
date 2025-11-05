import { describe, it, expect, beforeEach } from "vitest";
import { injectSessionState } from "../../utils/instructions-utils";
import type { InvocationContext } from "../../agents/invocation-context";
import { ReadonlyContext } from "../../agents/readonly-context";

describe("injectSessionState", () => {
	let mockContext: InvocationContext;
	let readonlyContext: ReadonlyContext;

	beforeEach(() => {
		mockContext = {
			session: {
				id: "test-session",
				appName: "test-app",
				userId: "test-user",
				state: {},
			},
			artifactService: null,
		} as any;
		readonlyContext = new ReadonlyContext(mockContext);
	});

	describe("primitive state variables", () => {
		it("should inject string state variables", async () => {
			mockContext.session.state = { userName: "Alice" };
			const result = await injectSessionState(
				"Hello {userName}!",
				readonlyContext,
			);
			expect(result).toBe("Hello Alice!");
		});

		it("should inject number state variables", async () => {
			mockContext.session.state = { count: 42 };
			const result = await injectSessionState(
				"Count is {count}",
				readonlyContext,
			);
			expect(result).toBe("Count is 42");
		});

		it("should inject boolean state variables", async () => {
			mockContext.session.state = { isActive: true };
			const result = await injectSessionState(
				"Active: {isActive}",
				readonlyContext,
			);
			expect(result).toBe("Active: true");
		});
	});

	describe("object state variables", () => {
		it("should inject object state variables as formatted JSON", async () => {
			mockContext.session.state = {
				user: { name: "Alice", age: 30 },
			};
			const result = await injectSessionState(
				"User data: {user}",
				readonlyContext,
			);
			expect(result).toBe('User data: {\n  "name": "Alice",\n  "age": 30\n}');
		});

		it("should inject array state variables as formatted JSON", async () => {
			mockContext.session.state = {
				items: ["apple", "banana", "cherry"],
			};
			const result = await injectSessionState(
				"Items: {items}",
				readonlyContext,
			);
			expect(result).toBe('Items: [\n  "apple",\n  "banana",\n  "cherry"\n]');
		});

		it("should inject complex nested object as formatted JSON", async () => {
			mockContext.session.state = {
				basket: {
					fruits: [
						{ name: "apple", color: "red" },
						{ name: "banana", color: "yellow" },
					],
				},
			};
			const result = await injectSessionState(
				"Basket: {basket}",
				readonlyContext,
			);
			expect(result).toContain('"fruits"');
			expect(result).toContain('"name": "apple"');
			expect(result).toContain('"color": "red"');
		});
	});

	describe("nested property access", () => {
		beforeEach(() => {
			mockContext.session.state = {
				basket: {
					fruits: [
						{ name: "apple", color: "red" },
						{ name: "banana", color: "yellow" },
					],
					count: 2,
				},
				user: {
					profile: {
						firstName: "John",
						lastName: "Doe",
					},
				},
			};
		});

		it("should access nested object properties", async () => {
			const result = await injectSessionState(
				"First name: {user.profile.firstName}",
				readonlyContext,
			);
			expect(result).toBe("First name: John");
		});

		it("should access array elements by index", async () => {
			const result = await injectSessionState(
				"First fruit: {basket.fruits[0].name}",
				readonlyContext,
			);
			expect(result).toBe("First fruit: apple");
		});

		it("should access nested array properties", async () => {
			const result = await injectSessionState(
				"Color: {basket.fruits[1].color}",
				readonlyContext,
			);
			expect(result).toBe("Color: yellow");
		});

		it("should access simple nested property", async () => {
			const result = await injectSessionState(
				"Count: {basket.count}",
				readonlyContext,
			);
			expect(result).toBe("Count: 2");
		});

		it("should handle multiple nested properties in one template", async () => {
			const result = await injectSessionState(
				"{user.profile.firstName} likes {basket.fruits[0].name}",
				readonlyContext,
			);
			expect(result).toBe("John likes apple");
		});
	});

	describe("optional variables", () => {
		it("should return empty string for missing optional variables", async () => {
			mockContext.session.state = {};
			const result = await injectSessionState(
				"Hello {userName?}!",
				readonlyContext,
			);
			expect(result).toBe("Hello !");
		});

		it("should throw error for missing required variables", async () => {
			mockContext.session.state = {};
			await expect(
				injectSessionState("Hello {userName}!", readonlyContext),
			).rejects.toThrow("Context variable not found: `userName`.");
		});
	});

	describe("multiple variables", () => {
		it("should inject multiple variables in one template", async () => {
			mockContext.session.state = {
				firstName: "Alice",
				lastName: "Smith",
				age: 25,
			};
			const result = await injectSessionState(
				"Name: {firstName} {lastName}, Age: {age}",
				readonlyContext,
			);
			expect(result).toBe("Name: Alice Smith, Age: 25");
		});
	});

	describe("edge cases", () => {
		it("should handle null values", async () => {
			mockContext.session.state = { value: null };
			const result = await injectSessionState(
				"Value: {value}",
				readonlyContext,
			);
			expect(result).toBe("Value: null");
		});

		it("should throw error for undefined values", async () => {
			mockContext.session.state = { value: undefined };
			await expect(
				injectSessionState("Value: {value}", readonlyContext),
			).rejects.toThrow("Context variable not found: `value`.");
		});

		it("should not replace invalid variable names", async () => {
			mockContext.session.state = { validName: "test" };
			const result = await injectSessionState(
				"Test {invalid-name} {validName}",
				readonlyContext,
			);
			expect(result).toBe("Test {invalid-name} test");
		});

		it("should validate root property for nested access", async () => {
			mockContext.session.state = { validName: { nested: "value" } };
			const result = await injectSessionState(
				"Test {invalid-name.nested} {validName.nested}",
				readonlyContext,
			);
			// invalid-name should not be replaced because root is invalid
			expect(result).toBe("Test {invalid-name.nested} value");
		});

		it("should handle quoted property names in bracket notation", async () => {
			mockContext.session.state = {
				obj: {
					"key-name": "value1",
					"another.key": "value2",
				},
			};
			const result1 = await injectSessionState(
				"Value: {obj['key-name']}",
				readonlyContext,
			);
			expect(result1).toBe("Value: value1");

			const result2 = await injectSessionState(
				'Value: {obj["another.key"]}',
				readonlyContext,
			);
			expect(result2).toBe("Value: value2");
		});
	});

	describe("error handling", () => {
		it("should throw error when root property doesn't exist", async () => {
			mockContext.session.state = { existingProp: "value" };
			await expect(
				injectSessionState("Test {nonExistentProp}", readonlyContext),
			).rejects.toThrow("Context variable not found: `nonExistentProp`.");
		});

		it("should throw error when nested property path doesn't exist", async () => {
			mockContext.session.state = {
				user: { profile: { name: "John" } },
			};
			await expect(
				injectSessionState("Test {user.profile.age}", readonlyContext),
			).rejects.toThrow("Context variable not found: `user.profile.age`.");
		});

		it("should throw error when intermediate object is null/undefined", async () => {
			mockContext.session.state = {
				user: null,
			};
			await expect(
				injectSessionState("Test {user.name}", readonlyContext),
			).rejects.toThrow("Context variable not found: `user.name`.");
		});

		it("should throw error when array index is out of bounds", async () => {
			mockContext.session.state = {
				items: ["apple", "banana"],
			};
			await expect(
				injectSessionState("Test {items[5]}", readonlyContext),
			).rejects.toThrow("Context variable not found: `items[5]`.");
		});

		it("should throw error on first unresolved variable", async () => {
			mockContext.session.state = {
				validVar: "resolved",
			};
			await expect(
				injectSessionState("Valid: {validVar}, Missing: {missingVar}", readonlyContext),
			).rejects.toThrow("Context variable not found: `missingVar`.");
		});

		it("should throw error for complex nested expressions that don't exist", async () => {
			mockContext.session.state = {
				basket: {
					fruits: [
						{ name: "apple" },
					],
				},
			};
			await expect(
				injectSessionState("Missing: {basket.fruits[1].name}", readonlyContext),
			).rejects.toThrow("Context variable not found: `basket.fruits[1].name`.");
		});
	});
});
