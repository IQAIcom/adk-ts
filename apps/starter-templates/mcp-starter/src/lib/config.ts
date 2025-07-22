export const config = {
	weatherApi: {
		baseUrl: "https://api.openweathermap.org/data/2.5",
		apiKey: process.env.OPENWEATHER_API_KEY || "",
		defaultUnits: "metric", // metric (Celsius) or imperial (Fahrenheit)
	},
};
