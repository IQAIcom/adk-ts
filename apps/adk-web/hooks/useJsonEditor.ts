import { useState } from "react";

export interface UseJsonEditorOptions {
	placeholder?: string;
	initialValue?: string;
	onValidate?: (value: string) => string | null;
	onFormat?: (value: string) => string;
	onFix?: (value: string) => string;
}

export interface UseJsonEditorReturn {
	value: string;
	error: string | null;
	placeholder: string;
	setValue: (value: string) => void;
	setError: (error: string | null) => void;
	validate: () => string | null;
	format: () => void;
	fix: () => void;
	reset: (newValue?: string) => void;
	isValid: boolean;
}

export function useJsonEditor(
	options: UseJsonEditorOptions = {},
): UseJsonEditorReturn {
	const {
		placeholder = "",
		initialValue = "",
		onValidate,
		onFormat,
		onFix,
	} = options;

	const [value, setValue] = useState(initialValue);
	const [error, setError] = useState<string | null>(null);

	const validateJson = (jsonValue: string): string | null => {
		if (!jsonValue.trim()) return "JSON cannot be empty";
		try {
			JSON.parse(jsonValue);
			return null;
		} catch (error) {
			if (error instanceof SyntaxError) {
				// Provide more helpful error messages for common issues
				const message = error.message;
				if (message.includes("Unexpected token '")) {
					return "JSON Error: Use double quotes (\") for strings, not single quotes (')";
				}
				if (message.includes("Unexpected token")) {
					return `JSON Error: ${message} - Check for missing commas or quotes`;
				}
				if (message.includes("Expected property name")) {
					return "JSON Error: Object properties must be in double quotes";
				}
				if (message.includes("Unexpected end of JSON input")) {
					return "JSON Error: JSON is incomplete - missing closing braces/brackets";
				}
				return `JSON Error: ${message}`;
			}
			return "Invalid JSON format";
		}
	};

	const defaultValidate = (jsonValue: string): string | null => {
		if (!jsonValue.trim()) return "JSON cannot be empty";
		try {
			JSON.parse(jsonValue);
			return null;
		} catch (error) {
			if (error instanceof SyntaxError) {
				const message = error.message;
				if (message.includes("Unexpected token '")) {
					return "JSON Error: Use double quotes (\") for strings, not single quotes (')";
				}
				if (message.includes("Unexpected token")) {
					return `JSON Error: ${message} - Check for missing commas or quotes`;
				}
				if (message.includes("Expected property name")) {
					return "JSON Error: Object properties must be in double quotes";
				}
				if (message.includes("Unexpected end of JSON input")) {
					return "JSON Error: JSON is incomplete - missing closing braces/brackets";
				}
				return `JSON Error: ${message}`;
			}
			return "Invalid JSON format";
		}
	};

	const defaultFormat = (jsonValue: string): string => {
		try {
			const parsed = JSON.parse(jsonValue);
			return JSON.stringify(parsed, null, 2);
		} catch {
			return jsonValue;
		}
	};

	const defaultFix = (jsonValue: string): string => {
		// Simple regex to convert single quotes to double quotes for string values
		return jsonValue.replace(/'([^']*)'/g, '"$1"');
	};

	const validate = (): string | null => {
		const validationFn = onValidate || defaultValidate;
		const validationError = validationFn(value);
		setError(validationError);
		return validationError;
	};

	const format = (): void => {
		const formatFn = onFormat || defaultFormat;
		const formatted = formatFn(value);
		setValue(formatted);
		setError(null);
	};

	const fix = (): void => {
		const fixFn = onFix || defaultFix;
		const fixed = fixFn(value);
		setValue(fixed);
		const validationError = validateJson(fixed);
		setError(validationError);
	};

	const reset = (newValue = ""): void => {
		setValue(newValue);
		setError(null);
	};

	const handleValueChange = (newValue: string): void => {
		setValue(newValue);
		const validationFn = onValidate || defaultValidate;
		const validationError = validationFn(newValue);
		setError(validationError);
	};

	return {
		value,
		error,
		placeholder,
		setValue: handleValueChange,
		setError,
		validate,
		format,
		fix,
		reset,
		isValid: !error,
	};
}
