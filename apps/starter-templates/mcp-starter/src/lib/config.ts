/**
 * Configuration object for the MCP weather server.
 *
 * Centralizes all configuration values including API endpoints,
 * authentication keys, and default settings. Reads sensitive values
 * from environment variables for security.
 */
export const config = {
	weatherApi: {
		baseUrl: "https://api.openweathermap.org/data/2.5",
		apiKey: process.env.OPENWEATHER_API_KEY || "",
		defaultUnits: "metric", // metric (Celsius) or imperial (Fahrenheit)
	},
};
