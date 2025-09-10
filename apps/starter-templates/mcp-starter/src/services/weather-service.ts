import { z } from "zod";
import { fetchJson } from "../lib/http.js";
import { config } from "../lib/config.js";

/**
 * Zod schema for validating OpenWeather API response structure.
 * Ensures the response contains all required weather data fields.
 */
const weatherResponseSchema = z.object({
	weather: z.array(
		z.object({
			id: z.number(),
			main: z.string(),
			description: z.string(),
			icon: z.string(),
		}),
	),
	main: z.object({
		temp: z.number(),
		feels_like: z.number(),
		temp_min: z.number(),
		temp_max: z.number(),
		humidity: z.number(),
	}),
	wind: z.object({
		speed: z.number(),
		deg: z.number(),
	}),
	name: z.string(),
});

type WeatherResponse = z.infer<typeof weatherResponseSchema>;

/**
 * Structured weather data interface for consistent data representation.
 */
export interface WeatherData {
	location: string;
	temperature: number;
	feelsLike: number;
	condition: string;
	description: string;
	humidity: number;
	windSpeed: number;
}

/**
 * Service class for interacting with the OpenWeather API.
 *
 * Provides methods to fetch current weather conditions for cities worldwide.
 * Handles API authentication, request construction, response validation,
 * and data transformation. Includes proper error handling for missing API keys
 * and network issues.
 */
export class WeatherService {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly units: string;

	constructor() {
		this.apiKey = config.weatherApi.apiKey;
		this.baseUrl = config.weatherApi.baseUrl;
		this.units = config.weatherApi.defaultUnits;
	}

	/**
	 * Fetches current weather data for a specified city.
	 *
	 * @param city - Name of the city to get weather for
	 * @returns Promise resolving to structured weather data
	 * @throws Error if API key is not configured or if API request fails
	 */
	async getWeatherByCity(city: string): Promise<WeatherData> {
		if (!this.apiKey) {
			throw new Error("Weather API key is not configured");
		}

		const url = new URL(`${this.baseUrl}/weather`);
		url.searchParams.append("q", city);
		url.searchParams.append("appid", this.apiKey);
		url.searchParams.append("units", this.units);

		const data = await fetchJson<WeatherResponse>(
			url.toString(),
			undefined,
			weatherResponseSchema,
		);

		return this.transformWeatherData(data);
	}

	/**
	 * Transforms raw OpenWeather API response into structured WeatherData format.
	 *
	 * @param data - Validated OpenWeather API response
	 * @returns Structured weather data with consistent field names
	 */
	private transformWeatherData(data: WeatherResponse): WeatherData {
		return {
			location: data.name,
			temperature: data.main.temp,
			feelsLike: data.main.feels_like,
			condition: data.weather[0]?.main || "Unknown",
			description: data.weather[0]?.description || "Unknown condition",
			humidity: data.main.humidity,
			windSpeed: data.wind.speed,
		};
	}
}
