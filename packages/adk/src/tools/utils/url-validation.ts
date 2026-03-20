/**
 * Validates a URL is safe for outbound requests.
 * Blocks private/internal IPs, non-HTTP protocols, and localhost.
 */
export function validateUrlForFetch(urlString: string): URL {
	const url = new URL(urlString);

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new Error(
			`Blocked URL: only http and https protocols are allowed, got ${url.protocol}`,
		);
	}

	const hostname = url.hostname.toLowerCase();

	if (hostname === "localhost" || hostname === "[::1]") {
		throw new Error("Blocked URL: localhost is not allowed");
	}

	// Extract IPv4 from IPv6-mapped addresses like [::ffff:7f00:1] or [::ffff:127.0.0.1]
	const ipv4 = extractIPv4(hostname);
	if (ipv4 !== null && isPrivateIP(ipv4)) {
		throw new Error(
			"Blocked URL: private/internal IP addresses are not allowed",
		);
	}

	if (isPrivateIP(hostname)) {
		throw new Error(
			"Blocked URL: private/internal IP addresses are not allowed",
		);
	}

	return url;
}

/**
 * Extract an IPv4 address from an IPv6-mapped IPv4 hostname.
 * Handles both dotted (::ffff:127.0.0.1) and hex (::ffff:7f00:1) forms.
 */
function extractIPv4(hostname: string): string | null {
	// Strip brackets from IPv6
	const bare = hostname.replace(/^\[|\]$/g, "");

	// Dotted form: ::ffff:127.0.0.1
	const dottedMatch = bare.match(
		/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i,
	);
	if (dottedMatch) return dottedMatch[1];

	// Hex form: ::ffff:7f00:1 → convert two 16-bit hex groups to IPv4
	const hexMatch = bare.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
	if (hexMatch) {
		const high = Number.parseInt(hexMatch[1], 16);
		const low = Number.parseInt(hexMatch[2], 16);
		return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
	}

	return null;
}

function isPrivateIP(hostname: string): boolean {
	const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (!match) return false;

	const [, a, b] = match;
	const first = Number(a);
	const second = Number(b);

	// 0.0.0.0/8 (entire block is reserved)
	if (first === 0) return true;
	// 127.0.0.0/8
	if (first === 127) return true;
	// 10.0.0.0/8
	if (first === 10) return true;
	// 172.16.0.0/12
	if (first === 172 && second >= 16 && second <= 31) return true;
	// 192.168.0.0/16
	if (first === 192 && second === 168) return true;
	// 169.254.0.0/16 (link-local / cloud metadata)
	if (first === 169 && second === 254) return true;

	return false;
}
