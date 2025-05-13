/**
 * Creates a retry wrapper for async methods that might encounter closed resource errors.
 * Similar to Python's retry_on_closed_resource decorator.
 *
 * @param reinitMethod Function that will be called to reinitialize resources
 * @param maxRetries Maximum number of retry attempts
 * @returns A decorator function that wraps the original method with retry logic
 */
export function retryOnClosedResource<T>(
	reinitMethod: (instance: T) => Promise<void>,
	maxRetries = 1,
) {
	return (
		_target: unknown,
		_propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>,
	) => {
		const originalMethod = descriptor.value;
		if (!originalMethod) return descriptor;

		descriptor.value = async function (this: T, ...args: any[]) {
			let attempt = 0;

			while (attempt <= maxRetries) {
				try {
					return await originalMethod.apply(this, args);
				} catch (error) {
					// Check if this is a closed resource error
					// Adjust this condition based on your specific error types
					const isClosedResourceError =
						error instanceof Error &&
						(error.message.includes("closed") ||
							error.message.includes("ECONNRESET") ||
							error.message.includes("socket hang up"));

					if (!isClosedResourceError || attempt >= maxRetries) {
						throw error;
					}

					console.warn(
						`Resource closed, reinitializing (attempt ${attempt + 1}/${maxRetries + 1})...`,
					);

					try {
						// Call the reinitialization method
						await reinitMethod(this);
					} catch (reinitError) {
						console.error("Error reinitializing resources:", reinitError);
						throw new Error(`Failed to reinitialize resources: ${reinitError}`);
					}

					attempt++;
				}
			}
		};

		return descriptor;
	};
}

/**
 * Function version of the retry decorator for use without decorators
 *
 * @param fn The async function to wrap with retry logic
 * @param instance The instance containing the function
 * @param reinitMethod Function that will be called to reinitialize resources
 * @param maxRetries Maximum number of retry attempts
 * @returns A wrapped function with retry logic
 */
export function withRetry<T, Args extends any[], Return>(
	fn: (this: T, ...args: Args) => Promise<Return>,
	instance: T,
	reinitMethod: (instance: T) => Promise<void>,
	maxRetries = 1,
): (...args: Args) => Promise<Return> {
	return async (...args: Args): Promise<Return> => {
		let attempt = 0;

		while (attempt <= maxRetries) {
			try {
				return await fn.apply(instance, args);
			} catch (error) {
				// Check if this is a closed resource error
				const isClosedResourceError =
					error instanceof Error &&
					(error.message.includes("closed") ||
						error.message.includes("ECONNRESET") ||
						error.message.includes("socket hang up"));

				if (!isClosedResourceError || attempt >= maxRetries) {
					throw error;
				}

				console.warn(
					`Resource closed, reinitializing (attempt ${attempt + 1}/${maxRetries + 1})...`,
				);

				try {
					// Call the reinitialization method
					await reinitMethod(instance);
				} catch (reinitError) {
					console.error("Error reinitializing resources:", reinitError);
					throw new Error(`Failed to reinitialize resources: ${reinitError}`);
				}

				attempt++;
			}
		}

		// This should never be reached due to the while loop, but TypeScript needs it
		throw new Error("Unexpected end of retry loop");
	};
}
