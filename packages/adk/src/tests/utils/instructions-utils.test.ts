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

		it("should return original expression for missing required variables (fallback)", async () => {
			mockContext.session.state = {};
			const result = await injectSessionState(
				"Hello {userName}!",
				readonlyContext,
			);
			expect(result).toBe("Hello {userName}!");
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

		it("should return original expression for undefined values (fallback)", async () => {
			mockContext.session.state = { value: undefined };
			const result = await injectSessionState(
				"Value: {value}",
				readonlyContext,
			);
			expect(result).toBe("Value: {value}");
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

	describe("fallback behavior", () => {
		it("should return original expression when root property doesn't exist", async () => {
			mockContext.session.state = { existingProp: "value" };
			const result = await injectSessionState(
				"Test {nonExistentProp} and {existingProp}",
				readonlyContext,
			);
			expect(result).toBe("Test {nonExistentProp} and value");
		});

		it("should return original expression when nested property path doesn't exist", async () => {
			mockContext.session.state = {
				user: { profile: { name: "John" } },
			};
			const result = await injectSessionState(
				"Test {user.profile.age} and {user.profile.name}",
				readonlyContext,
			);
			expect(result).toBe("Test {user.profile.age} and John");
		});

		it("should return original expression when intermediate object is null/undefined", async () => {
			mockContext.session.state = {
				user: null,
				data: { nested: null },
			};
			const result = await injectSessionState(
				"Test {user.name} and {data.nested.value}",
				readonlyContext,
			);
			expect(result).toBe("Test {user.name} and {data.nested.value}");
		});

		it("should return original expression when array index is out of bounds", async () => {
			mockContext.session.state = {
				items: ["apple", "banana"],
			};
			const result = await injectSessionState(
				"Test {items[5]} and {items[0]}",
				readonlyContext,
			);
			expect(result).toBe("Test {items[5]} and apple");
		});

		it("should mix resolved and unresolved variables in the same template", async () => {
			mockContext.session.state = {
				validVar: "resolved",
				nested: { prop: "value" },
			};
			const result = await injectSessionState(
				"Valid: {validVar}, Missing: {missingVar}, Nested: {nested.prop}, Deep: {nested.missing.deep}",
				readonlyContext,
			);
			expect(result).toBe("Valid: resolved, Missing: {missingVar}, Nested: value, Deep: {nested.missing.deep}");
		});

		it("should handle fallback with complex nested expressions", async () => {
			mockContext.session.state = {
				basket: {
					fruits: [
						{ name: "apple" },
					],
				},
			};
			const result = await injectSessionState(
				"Available: {basket.fruits[0].name}, Missing: {basket.fruits[1].name}",
				readonlyContext,
			);
			expect(result).toBe("Available: apple, Missing: {basket.fruits[1].name}");
		});
	});
});
