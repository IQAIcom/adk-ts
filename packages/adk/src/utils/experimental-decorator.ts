export function experimental(targetOrDescriptor: any): any {
	if (typeof targetOrDescriptor === "function") {
		console.warn(
			`Warning: Using experimental feature '${targetOrDescriptor.name}'`,
		);
		return targetOrDescriptor;
	}
	if (targetOrDescriptor?.value) {
		const originalValue = targetOrDescriptor.value;
		targetOrDescriptor.value = function (...args: any[]) {
			console.warn("Warning: Using experimental feature");
			return originalValue.apply(this, args);
		};
		return targetOrDescriptor;
	}
	return targetOrDescriptor;
}
