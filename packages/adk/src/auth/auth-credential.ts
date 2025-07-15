import type { AuthConfig } from ".";
import type { ApiKeyScheme } from "./auth-schemes";

/**
 * Types of authentication credentials
 */
export enum AuthCredentialType {
	API_KEY = "api_key",
	BASIC = "basic",
	BEARER = "bearer",
	OAUTH2 = "oauth2",
	CUSTOM = "custom",
}

/**
 * Base class for authentication credentials
 */
export abstract class AuthCredential {
	/**
	 * Type of credential
	 */
	type: AuthCredentialType;

	/**
	 * Constructor for AuthCredential
	 */
	constructor(type: AuthCredentialType) {
		this.type = type;
	}

	/**
	 * Gets the authentication token
	 */
	abstract getToken(): string | undefined;

	/**
	 * Gets headers for HTTP requests
	 */
	abstract getHeaders(config: AuthConfig): Record<string, string>;

	/**
	 * Whether the token can be refreshed
	 */
	canRefresh(): boolean {
		return false;
	}

	/**
	 * Refreshes the token
	 */
	async refresh(): Promise<void> {
		throw new Error("Token refresh not supported for this credential type");
	}
}

/**
 * API Key credential
 */
export class ApiKeyCredential extends AuthCredential {
	/**
	 * The API key
	 */
	apiKey: string;

	/**
	 * Constructor for ApiKeyCredential
	 */
	constructor(apiKey: string) {
		super(AuthCredentialType.API_KEY);
		this.apiKey = apiKey;
	}

	/**
	 * Gets the API key as the token
	 */
	getToken(): string {
		return this.apiKey;
	}

	/**
	 * Gets headers for HTTP requests
	 */
	getHeaders(config: AuthConfig): Record<string, string> {
		const scheme = config.authScheme as ApiKeyScheme;

		if (scheme.in === "header") {
			return { [scheme.name]: this.apiKey };
		}

		return {};
	}
}

/**
 * Basic authentication credential
 */
export class BasicAuthCredential extends AuthCredential {
	/**
	 * The username
	 */
	username: string;

	/**
	 * The password
	 */
	password: string;

	/**
	 * Constructor for BasicAuthCredential
	 */
	constructor(username: string, password: string) {
		super(AuthCredentialType.BASIC);
		this.username = username;
		this.password = password;
	}

	/**
	 * Gets the encoded basic auth token
	 */
	getToken(): string {
		return Buffer.from(`${this.username}:${this.password}`).toString("base64");
	}

	/**
	 * Gets headers for HTTP requests
	 */
	getHeaders(): Record<string, string> {
		return {
			Authorization: `Basic ${this.getToken()}`,
		};
	}
}

/**
 * Bearer token credential
 */
export class BearerTokenCredential extends AuthCredential {
	/**
	 * The bearer token
	 */
	token: string;

	/**
	 * Constructor for BearerTokenCredential
	 */
	constructor(token: string) {
		super(AuthCredentialType.BEARER);
		this.token = token;
	}

	/**
	 * Gets the bearer token
	 */
	getToken(): string {
		return this.token;
	}

	/**
	 * Gets headers for HTTP requests
	 */
	getHeaders(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.token}`,
		};
	}
}

/**
 * OAuth2 token credential with refresh capability
 */
export class OAuth2Credential extends AuthCredential {
	/**
	 * The access token
	 */
	accessToken: string;

	/**
	 * The refresh token
	 */
	refreshToken?: string;

	/**
	 * When the token expires
	 */
	expiresAt?: Date;

	/**
	 * Function to refresh the token
	 */
	private refreshFunction?: (refreshToken: string) => Promise<{
		accessToken: string;
		refreshToken?: string;
		expiresIn?: number;
	}>;

	/**
	 * Constructor for OAuth2Credential
	 */
	constructor(config: {
		accessToken: string;
		refreshToken?: string;
		expiresIn?: number;
		refreshFunction?: (refreshToken: string) => Promise<{
			accessToken: string;
			refreshToken?: string;
			expiresIn?: number;
		}>;
	}) {
		super(AuthCredentialType.OAUTH2);
		this.accessToken = config.accessToken;
		this.refreshToken = config.refreshToken;

		if (config.expiresIn) {
			this.expiresAt = new Date(Date.now() + config.expiresIn * 1000);
		}

		this.refreshFunction = config.refreshFunction;
	}

	/**
	 * Gets the access token
	 */
	getToken(): string {
		return this.accessToken;
	}

	/**
	 * Gets headers for HTTP requests
	 */
	getHeaders(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.accessToken}`,
		};
	}

	/**
	 * Whether the token can be refreshed
	 */
	canRefresh(): boolean {
		return !!this.refreshToken && !!this.refreshFunction;
	}

	/**
	 * Whether the token is expired
	 */
	isExpired(): boolean {
		if (!this.expiresAt) {
			return false;
		}

		// Consider it expired if it's less than 30 seconds from expiration
		return this.expiresAt.getTime() - 30_000 < Date.now();
	}

	/**
	 * Refreshes the token
	 */
	async refresh(): Promise<void> {
		if (!this.canRefresh()) {
			throw new Error(
				"Cannot refresh token: no refresh token or refresh function"
			);
		}

		const result = await this.refreshFunction?.(this.refreshToken!);

		if (!result) {
			throw new Error("Failed to refresh token");
		}

		this.accessToken = result.accessToken;

		if (result.refreshToken) {
			this.refreshToken = result.refreshToken;
		}

		if (result.expiresIn) {
			this.expiresAt = new Date(Date.now() + result.expiresIn * 1000);
		}
	}
}
