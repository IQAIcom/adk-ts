import type { LoggerOptions } from "pino";

export function getLoggerConfig(): LoggerOptions {
	const level =
		process.env.ADK_LOG_LEVEL || (isDebugEnabled() ? "debug" : "info");
	const format = process.env.ADK_LOG_FORMAT || "pretty";

	const config: LoggerOptions = {
		level,
		formatters: {
			level: (label) => ({ level: label }),
			bindings: (bindings) => ({
				...bindings,
				framework: "adk",
				pid: undefined, // Remove pid for cleaner logs
				hostname: undefined, // Remove hostname for cleaner logs
			}),
		},
	};

	// Development: pretty printing with customizable options
	if (
		format === "pretty" &&
		(process.env.NODE_ENV === "development" || isDebugEnabled())
	) {
		const prettyOptions: any = {
			colorize: process.env.ADK_LOG_COLORIZE !== "false", // Default true, set to "false" to disable
			ignore: "pid,hostname,framework",
			translateTime: process.env.ADK_LOG_TIME_FORMAT || "HH:mm:ss", // Customizable time format
			singleLine: process.env.ADK_LOG_SINGLE_LINE === "true", // Default false, set to "true" for compact
			messageFormat:
				process.env.ADK_LOG_MESSAGE_FORMAT || "{component} | {msg}",
		};

		// Additional pretty options based on env vars
		if (process.env.ADK_LOG_HIDE_OBJECT === "true") {
			prettyOptions.hideObject = true; // Hide JSON objects, show only messages
		}

		if (process.env.ADK_LOG_MINIMAL === "true") {
			prettyOptions.ignore = "pid,hostname,framework,time"; // Minimal output
			prettyOptions.messageFormat = "{msg}";
		}

		config.transport = {
			target: "pino-pretty",
			options: prettyOptions,
		};
	}

	// Production file logging
	if (process.env.ADK_LOG_FILE) {
		config.transport = {
			target: "pino/file",
			options: {
				destination: process.env.ADK_LOG_FILE,
				mkdir: true,
			},
		};
	}

	return config;
}

function isDebugEnabled(): boolean {
	return (
		process.env.NODE_ENV === "development" || process.env.ADK_DEBUG === "true"
	);
}
