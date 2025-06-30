import type { AuthConfig } from "./auth-config";
import type { AuthCredential } from "./auth-credential";
import type { AuthScheme } from "./auth-schemes";

/**
 * Enhanced auth configuration with credential handling
 * This extends the basic AuthConfig with raw and exchanged credentials
 */
export class EnhancedAuthConfig {
	/**
	 * The authentication scheme
	 */
	authScheme: AuthScheme;

	/**
	 * Raw auth credential used to collect credentials
	 * Used in auth schemes that need to exchange credentials (e.g. OAuth2, OIDC)
	 */
	rawAuthCredential?: AuthCredential;

	/**
	 * Exchanged auth credential after processing
	 * Filled by ADK and client working together
	 */
	exchangedAuthCredential?: AuthCredential;

	/**
	 * User-specified key for credential storage and retrieval
	 */
	credentialKey?: string;

	/**
	 * Additional context properties
	 */
	context?: Record<string, any>;

	/**
	 * Constructor for EnhancedAuthConfig
	 */
	constructor(config: {
		authScheme: AuthScheme;
		rawAuthCredential?: AuthCredential;
		exchangedAuthCredential?: AuthCredential;
		credentialKey?: string;
		context?: Record<string, any>;
	}) {
		this.authScheme = config.authScheme;
		this.rawAuthCredential = config.rawAuthCredential;
		this.exchangedAuthCredential = config.exchangedAuthCredential;
		this.context = config.context;
		this.credentialKey = config.credentialKey || this.generateCredentialKey();
	}

	/**
	 * Generates a credential key based on auth scheme and raw credential
	 * Used for saving/loading credentials from credential service
	 */
	private generateCredentialKey(): string {
		// Create a simple hash-like key based on scheme and credential
		const schemeKey = this.authScheme.type || "unknown";
		const credentialKey = this.rawAuthCredential?.type || "none";

		// Generate a simple key (in production, this should be more robust)
		const timestamp = Date.now();
		return `adk_${schemeKey}_${credentialKey}_${timestamp}`;
	}

	/**
	 * Gets the credential key for storage
	 */
	getCredentialKey(): string {
		return this.credentialKey || this.generateCredentialKey();
	}
}

/**
 * Arguments for the special long-running function tool used to request
 * end-user credentials
 */
export interface AuthToolArguments extends Record<string, unknown> {
	/**
	 * The ID of the function call that requires authentication
	 */
	function_call_id: string;

	/**
	 * The authentication configuration
	 */
	auth_config: AuthConfig | EnhancedAuthConfig;
}

/**
 * Auth tool for handling credential requests
 */
export class AuthTool {
	/**
	 * Processes auth tool arguments and returns appropriate response
	 */
	static async processAuthRequest(args: AuthToolArguments): Promise<{
		status: string;
		authConfig?: AuthConfig | EnhancedAuthConfig;
		credentialKey?: string;
	}> {
		try {
			const { function_call_id, auth_config } = args;

			// Generate credential key if not provided
			let credentialKey: string;
			if (auth_config instanceof EnhancedAuthConfig) {
				credentialKey = auth_config.getCredentialKey();
			} else {
				// Create a simple key for basic AuthConfig
				credentialKey = `adk_${auth_config.authScheme.type}_${Date.now()}`;
			}

			return {
				status: "auth_request_processed",
				authConfig: auth_config,
				credentialKey: credentialKey,
			};
		} catch (error) {
			return {
				status: "auth_request_failed",
			};
		}
	}

	/**
	 * Validates auth tool arguments
	 */
	static validateAuthArguments(args: any): args is AuthToolArguments {
		return (
			typeof args === "object" &&
			typeof args.function_call_id === "string" &&
			args.auth_config &&
			typeof args.auth_config === "object"
		);
	}
}

/**
 * Creates an AuthToolArguments object with proper typing
 */
export function createAuthToolArguments(
	functionCallId: string,
	authConfig: AuthConfig | EnhancedAuthConfig,
): AuthToolArguments {
	return {
		function_call_id: functionCallId,
		auth_config: authConfig,
	};
}

/**
 * Type guard to check if an auth config is enhanced
 */
export function isEnhancedAuthConfig(
	config: AuthConfig | EnhancedAuthConfig,
): config is EnhancedAuthConfig {
	return config instanceof EnhancedAuthConfig;
}
