import { z } from "zod";
import { fetchJson } from "../lib/http.js";
import { config } from "../lib/config.js";

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

export interface WeatherData {
	location: string;
	temperature: number;
	feelsLike: number;
	condition: string;
	description: string;
	humidity: number;
	windSpeed: number;
}

export class WeatherService {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly units: string;

	constructor() {
		this.apiKey = config.weatherApi.apiKey;
		this.baseUrl = config.weatherApi.baseUrl;
		this.units = config.weatherApi.defaultUnits;
	}

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
