import { describe, it, expect } from "vitest";
import { validateUrlForFetch } from "../../tools/utils/url-validation";

describe("validateUrlForFetch", () => {
	it("allows https URLs", () => {
		const url = validateUrlForFetch("https://example.com/api");
		expect(url.hostname).toBe("example.com");
	});

	it("allows http URLs", () => {
		const url = validateUrlForFetch("http://example.com");
		expect(url.protocol).toBe("http:");
	});

	it("blocks file:// protocol", () => {
		expect(() => validateUrlForFetch("file:///etc/passwd")).toThrow(
			"only http and https protocols are allowed",
		);
	});

	it("blocks ftp:// protocol", () => {
		expect(() => validateUrlForFetch("ftp://example.com")).toThrow(
			"only http and https protocols are allowed",
		);
	});

	it("blocks localhost", () => {
		expect(() => validateUrlForFetch("http://localhost/admin")).toThrow(
			"localhost is not allowed",
		);
	});

	it("blocks IPv6 loopback", () => {
		expect(() => validateUrlForFetch("http://[::1]/admin")).toThrow(
			"localhost is not allowed",
		);
	});

	it("blocks 127.0.0.1 (loopback)", () => {
		expect(() => validateUrlForFetch("http://127.0.0.1")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks 10.x.x.x (private)", () => {
		expect(() => validateUrlForFetch("http://10.0.0.1")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks 172.16.x.x (private)", () => {
		expect(() => validateUrlForFetch("http://172.16.0.1")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks 192.168.x.x (private)", () => {
		expect(() => validateUrlForFetch("http://192.168.1.1")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks 169.254.169.254 (cloud metadata)", () => {
		expect(() => validateUrlForFetch("http://169.254.169.254")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks 0.0.0.0", () => {
		expect(() => validateUrlForFetch("http://0.0.0.0")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks 0.0.0.1 (entire 0/8 block is reserved)", () => {
		expect(() => validateUrlForFetch("http://0.0.0.1")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks IPv6-mapped loopback [::ffff:127.0.0.1]", () => {
		expect(() => validateUrlForFetch("http://[::ffff:127.0.0.1]")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks IPv6-mapped metadata [::ffff:169.254.169.254]", () => {
		expect(() =>
			validateUrlForFetch("http://[::ffff:169.254.169.254]"),
		).toThrow("private/internal IP");
	});

	it("blocks IPv6-mapped hex form [::ffff:7f00:1]", () => {
		expect(() => validateUrlForFetch("http://[::ffff:7f00:1]")).toThrow(
			"private/internal IP",
		);
	});

	it("allows 172.32.0.1 (outside private range)", () => {
		const url = validateUrlForFetch("http://172.32.0.1");
		expect(url.hostname).toBe("172.32.0.1");
	});

	it("allows 169.255.0.1 (outside link-local range)", () => {
		const url = validateUrlForFetch("http://169.255.0.1");
		expect(url.hostname).toBe("169.255.0.1");
	});

	it("blocks dword IP format (Node URL normalizes to dotted decimal)", () => {
		// 2130706433 = 127.0.0.1, Node's URL parser normalizes it
		expect(() => validateUrlForFetch("http://2130706433")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks octal IP format", () => {
		// 0177.0.0.1 = 127.0.0.1
		expect(() => validateUrlForFetch("http://0177.0.0.1")).toThrow(
			"private/internal IP",
		);
	});

	it("blocks hex IP format", () => {
		// 0x7f000001 = 127.0.0.1
		expect(() => validateUrlForFetch("http://0x7f000001")).toThrow(
			"private/internal IP",
		);
	});

	it("throws on invalid URL", () => {
		expect(() => validateUrlForFetch("not-a-url")).toThrow();
	});
});
