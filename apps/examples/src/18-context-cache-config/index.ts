import { randomUUID } from "node:crypto";
import {
	AgentBuilder,
	ContextCacheConfig,
	createTool,
	InMemorySessionService,
} from "@iqai/adk";
import { openrouter } from "@openrouter/ai-sdk-provider";
import dedent from "dedent";
import { z } from "zod";
import { ask } from "../utils";

/**
 * Context Caching Demo with Long Prompts
 *
 * This example demonstrates context caching by using extensive system instructions
 * and comprehensive tool definitions that exceed the minimum token threshold (4096).
 * The cache will store the processed prompt, reducing latency and costs for
 * subsequent requests within the TTL window.
 */

const outputSchema = z.object({
	country: z.string(),
	capital: z.string(),
	population: z.number().optional(),
	area_km2: z.number().optional(),
	currency: z.string().optional(),
	languages: z.array(z.string()).optional(),
	fun_fact: z.string(),
	historical_note: z.string().optional(),
	tourist_attractions: z.array(z.string()).optional(),
});

const saveCountryTool = createTool({
	name: "save_country_info",
	description: dedent`
		Save comprehensive country information to agent state for later retrieval.

		This tool stores detailed information about a country including:
		- Basic demographics (population, area)
		- Economic data (currency, GDP)
		- Cultural information (languages, religions)
		- Geographic details (borders, climate zones)
		- Historical context
		- Tourism and cultural highlights

		The stored information persists throughout the conversation session
		and can be retrieved using the view_last_country or view_first_country tools.

		Use this tool whenever you provide detailed information about a country
		to maintain conversation context and enable follow-up queries.
	`,
	schema: z.object({
		country: z.string().describe("Full country name"),
		capital: z.string().describe("Capital city name"),
		population: z.number().optional().describe("Current population estimate"),
		area_km2: z.number().optional().describe("Total area in square kilometers"),
		currency: z.string().optional().describe("Official currency"),
		languages: z.array(z.string()).optional().describe("Official languages"),
		fun_fact: z.string().describe("An interesting fact about the country"),
		historical_note: z.string().optional().describe("Historical context"),
		tourist_attractions: z
			.array(z.string())
			.optional()
			.describe("Major tourist destinations"),
	}),
	fn: (
		{
			country,
			capital,
			population,
			area_km2,
			currency,
			languages,
			fun_fact,
			historical_note,
			tourist_attractions,
		},
		context,
	) => {
		const countryData = {
			country,
			capital,
			population,
			area_km2,
			currency,
			languages,
			fun_fact,
			historical_note,
			tourist_attractions,
			timestamp: new Date().toISOString(),
		};

		context.state.set("lastCountry", countryData);
		context.state.set("countryHistory", [
			...context.state.get("countryHistory", []),
			countryData,
		]);

		return {
			success: true,
			message: `Successfully saved comprehensive information about ${country}`,
			data: countryData,
		};
	},
});

const viewLastCountryTool = createTool({
	name: "view_last_country",
	description: dedent`
		Retrieve the most recently saved country information from agent state.

		This tool accesses the conversation memory to recall details about
		the last country that was discussed and saved. It returns all available
		information including demographics, geography, economics, and cultural data.

		Use this tool when:
		- The user asks about the "last country" or "previous country"
		- You need to compare countries discussed in the conversation
		- The user wants to recall the most recent information
		- You need context about what was just discussed

		Returns null if no country has been saved yet in this session.
	`,
	schema: z.object({}),
	fn: (_, context) => {
		const data = context.state.get("lastCountry", null);

		return data
			? {
					found: true,
					...data,
					note: "This data was retrieved from conversation memory (most recent)",
				}
			: {
					found: false,
					message: "No country information has been saved in this session yet",
				};
	},
});

const viewFirstCountryTool = createTool({
	name: "view_first_country",
	description: dedent`
		Retrieve the FIRST country information discussed in this session.

		This tool accesses the conversation memory to recall details about
		the first country that was discussed and saved. It returns all available
		information from the beginning of the conversation.

		Use this tool when:
		- The user asks about the "first country" or "initial country"
		- You need to compare the first and last countries discussed
		- The user wants to recall what started the conversation
		- The user asks "what was the first country we discussed"

		Returns null if no country has been saved yet in this session.
	`,
	schema: z.object({}),
	fn: (_, context) => {
		const history = context.state.get("countryHistory", []) || [];

		if (history.length === 0) {
			return {
				found: false,
				message: "No country information has been saved in this session yet",
			};
		}

		const firstCountry = history[0];
		return {
			found: true,
			...firstCountry,
			note: "This is the first country discussed in this session",
		};
	},
});

const compareCountriesTool = createTool({
	name: "compare_countries",
	description: dedent`
		Compare multiple countries that have been discussed in the conversation.

		This tool retrieves all countries saved during the current session and
		provides a comparative analysis of their key metrics including:
		- Population and area comparisons
		- Economic indicators
		- Language diversity
		- Geographic relationships

		Use this tool when the user asks to:
		- Compare countries discussed earlier
		- See differences between nations
		- Analyze relative sizes, populations, or other metrics
		- Review the conversation history of countries
	`,
	schema: z.object({}),
	fn: (_, context) => {
		const history = context.state.get("countryHistory", []) || [];

		if (history.length === 0) {
			return {
				success: false,
				message: "No countries have been saved for comparison yet",
			};
		}

		return {
			success: true,
			count: history.length,
			countries: history,
			summary: `Retrieved ${history.length} country/countries for comparison`,
		};
	},
});

async function main() {
	console.log("🚀 Context Caching Demo with Long Prompts\n");
	console.log("=".repeat(60));

	const sessionService = new InMemorySessionService();

	// Configure context caching with parameters matching the Python example
	const cacheConfig = new ContextCacheConfig({
		minTokens: 4096, // Minimum tokens required to enable caching
		ttlSeconds: 600, // Cache TTL: 10 minutes
		cacheIntervals: 3, // Maximum invocations before cache refresh
	});

	// Create a very long, comprehensive system instruction to ensure we exceed minTokens
	const longInstruction = dedent`
		You are an expert Geography and Cultural Research Assistant with comprehensive
		knowledge of countries, territories, and regions worldwide. Your expertise spans
		multiple domains including geopolitics, demographics, economics, culture, history,
		and tourism.

		**Core Responsibilities:**

		As a geography specialist, you provide detailed, accurate, and engaging information
		about countries and territories. Your responses should be educational, well-researched,
		and tailored to the user's level of interest and expertise.

		**Knowledge Domains:**

		1. **Geographic Information:**
		   - Physical geography: terrain, climate zones, major geographical features
		   - Political geography: borders, territorial disputes, administrative divisions
		   - Location: coordinates, hemisphere, continental placement, neighboring countries
		   - Natural resources: minerals, agriculture, water resources, renewable energy potential
		   - Environmental concerns: climate change impacts, conservation efforts, biodiversity

		2. **Demographic Data:**
		   - Current population estimates and historical trends
		   - Population density and distribution patterns
		   - Urbanization rates and major metropolitan areas
		   - Age distribution and demographic pyramids
		   - Migration patterns and diaspora communities
		   - Ethnic composition and minority populations

		3. **Economic Analysis:**
		   - GDP and GDP per capita (current and historical)
		   - Major industries and economic sectors
		   - Trade partners and export/import compositions
		   - Currency information and exchange rate history
		   - Employment sectors and labor force participation
		   - Economic development indicators (HDI, Gini coefficient)
		   - Infrastructure development and investment

		4. **Cultural Intelligence:**
		   - Official and minority languages, linguistic diversity
		   - Religious composition and freedom of religion
		   - Cultural traditions, festivals, and celebrations
		   - Arts, literature, music, and cinema contributions
		   - Educational systems and literacy rates
		   - Sports culture and international achievements
		   - Cuisine and culinary traditions

		5. **Historical Context:**
		   - Pre-colonial and indigenous history
		   - Colonial period and independence movements
		   - Major historical events and turning points
		   - Political system evolution
		   - International relations and alliances
		   - Conflicts and peace processes

		6. **Tourism and Attractions:**
		   - UNESCO World Heritage Sites
		   - Natural wonders and national parks
		   - Major cities and urban attractions
		   - Cultural sites and museums
		   - Adventure and outdoor activities
		   - Travel advisories and safety information

		**Response Guidelines:**

		When answering questions about countries, always:

		1. **Save Information**: Use the save_country_info tool whenever you provide
		   detailed country information. This maintains conversation context and enables
		   follow-up queries and comparisons. IMPORTANT: Include all required fields
		   (country, capital, fun_fact) and optional fields when saving.

		2. **Be Comprehensive**: Provide thorough answers that cover multiple aspects
		   of the query. Don't just answer the literal question—offer relevant context
		   and interesting additional information.

		3. **Cite Approximate Data**: When providing statistical information, indicate
		   that figures are approximate and may vary by source. Mention the general
		   timeframe of the data (e.g., "as of 2024 estimates").

		4. **Include Fun Facts**: Always include engaging, lesser-known facts that
		   make the information memorable and interesting. These should be accurate
		   and verifiable, not trivial.

		5. **Provide Context**: Explain how the country compares to regional neighbors
		   or global averages where relevant. This helps users understand the information
		   in perspective.

		6. **Use Tools Effectively**:
		   - save_country_info: Save detailed information after providing it (include ALL fields)
		   - view_last_country: Retrieve the most recently discussed country data
		   - view_first_country: Retrieve the FIRST country discussed in the session
		   - compare_countries: Access full conversation history for comparisons

		7. **Maintain Objectivity**: Present information neutrally, acknowledging
		   different perspectives on controversial topics. Focus on factual, verifiable
		   information rather than political opinions.

		8. **Educational Tone**: Write in an engaging, accessible style that educates
		   while remaining interesting. Avoid overly academic language unless the
		   user's questions suggest they prefer technical detail.

		**Structured Output Format:**

		Your responses MUST follow the defined output schema, including these REQUIRED fields:
		- country: Full official country name (REQUIRED)
		- capital: Capital city name (REQUIRED)
		- fun_fact: An interesting, lesser-known fact (REQUIRED)

		And these OPTIONAL fields:
		- population: Current population estimate
		- area_km2: Total area in square kilometers
		- currency: Official currency name and code
		- languages: Array of official languages
		- historical_note: Significant historical context
		- tourist_attractions: Array of major tourist destinations

		CRITICAL: When using the view_first_country or view_last_country tools, you MUST
		return the retrieved country data in the proper schema format. If the tool returns
		country information, extract the fields and return them. Never return an error object
		or explanation text as your final response - always return valid country data.

		**Example Interaction Patterns:**

		User: "Tell me about Japan"
		Assistant: [Provides comprehensive information covering geography, population,
		culture, economy, and saves the data using save_country_info tool with ALL fields]

		User: "What about South Korea?"
		Assistant: [Provides information about South Korea, naturally comparing aspects
		to Japan since it was recently discussed, saves new data with ALL fields]

		User: "What was the first country we discussed?"
		Assistant: [Uses view_first_country tool to retrieve Japan's data, then returns
		it in the proper schema format with country, capital, fun_fact, and other fields]

		User: "Compare these two countries"
		Assistant: [Uses compare_countries tool to retrieve both and provides detailed
		comparative analysis]

		**Special Considerations:**

		- For disputed territories, acknowledge multiple perspectives neutrally
		- For countries with recent name changes, mention both current and former names
		- For small island nations, provide context about regional groupings
		- For landlocked countries, note their geographic challenges and neighbors
		- For countries with federal systems, clarify the distinction between
		  federal and state/provincial levels
		- For countries with multiple capitals, explain the distinction (administrative,
		  legislative, judicial)

		**Error Handling:**

		If you don't have specific information about a requested topic:
		1. Acknowledge the limitation honestly
		2. Provide related information you do have
		3. Suggest where the user might find that information
		4. Offer to answer related questions you can address

		However, when recalling saved country information using tools, you MUST return
		the data in the proper schema format. Never return error messages or explanations
		as your final output - always return valid country data matching the schema.

		**Conversation Memory:**

		You maintain state throughout the conversation. Use your tools to:
		- Build a history of countries discussed (in order)
		- Enable natural references to "the previous country" or "the first country"
		- Provide comparative context when moving between countries
		- Recall specific details without asking the user to repeat information

		Your goal is to be an authoritative, engaging, and educational resource for
		geographic and cultural information, making learning about the world's countries
		both informative and enjoyable.
	`;

	const startTime = Date.now();

	const { runner } = await AgentBuilder.withModel(
		openrouter("google/gemini-2.5-flash"),
	)
		.withDescription(
			"Advanced geography and cultural research assistant with comprehensive knowledge",
		)
		.withInstruction(longInstruction)
		.withOutputSchema(outputSchema)
		.withTools(
			saveCountryTool,
			viewLastCountryTool,
			viewFirstCountryTool,
			compareCountriesTool,
		)
		.withSessionService(sessionService, {
			state: {
				lastCountry: null,
				countryHistory: [],
			},
		})
		.withQuickSession({
			sessionId: randomUUID(),
			appName: "cached-geography-assistant",
		})
		.withContextCacheConfig(cacheConfig)
		.build();

	const buildTime = Date.now() - startTime;

	console.log("\n📦 Context Cache Configuration:");
	console.log(`   - Minimum tokens: ${cacheConfig.minTokens} tokens`);
	console.log(
		`   - Cache TTL: ${cacheConfig.ttlSeconds}s (${cacheConfig.ttlSeconds / 60} minutes)`,
	);
	console.log(
		`   - Cache refresh interval: ${cacheConfig.cacheIntervals} invocations`,
	);
	console.log(`   - Build time: ${buildTime}ms`);
	console.log(`\n${"=".repeat(60)}\n`);

	// First query - establishes the cache
	console.log("🔵 Query 1: France (will establish cache)");
	const start1 = Date.now();
	const response1 = await ask(
		runner,
		"Tell me about France. Include population, area, currency, languages, and interesting facts.",
		true,
	);
	const time1 = Date.now() - start1;

	console.log(
		dedent`
		🌍 Country:     ${response1.country}
		📍 Capital:     ${response1.capital}
		👥 Population:  ${response1.population ? response1.population.toLocaleString() : "N/A"}
		📏 Area:        ${response1.area_km2 ? response1.area_km2.toLocaleString() : "N/A"} km²
		💰 Currency:    ${response1.currency || "N/A"}
		🗣️  Languages:   ${response1.languages?.join(", ") || "N/A"}
		🎉 Fun fact:    ${response1.fun_fact}
		📜 History:     ${response1.historical_note || "N/A"}
		🏛️  Attractions: ${response1.tourist_attractions?.join(", ") || "N/A"}
		⏱️  Response time: ${time1}ms
		`,
	);

	console.log(`\n${"=".repeat(60)}\n`);

	// Second query - uses cached context (should be faster)
	console.log("🟢 Query 2: Germany (using cached context - should be faster)");
	const start2 = Date.now();
	const response2 = await ask(
		runner,
		"Now tell me about Germany with the same level of detail.",
		true,
	);
	const time2 = Date.now() - start2;

	console.log(
		dedent`
		🌍 Country:     ${response2.country}
		📍 Capital:     ${response2.capital}
		👥 Population:  ${response2.population ? response2.population.toLocaleString() : "N/A"}
		📏 Area:        ${response2.area_km2 ? response2.area_km2.toLocaleString() : "N/A"} km²
		💰 Currency:    ${response2.currency || "N/A"}
		🗣️  Languages:   ${response2.languages?.join(", ") || "N/A"}
		🎉 Fun fact:    ${response2.fun_fact}
		📜 History:     ${response2.historical_note || "N/A"}
		🏛️  Attractions: ${response2.tourist_attractions?.join(", ") || "N/A"}
		⏱️  Response time: ${time2}ms
		`,
	);

	console.log(`\n${"=".repeat(60)}\n`);

	// Third query - still within cache interval
	console.log("🟢 Query 3: Memory recall (still using cached context)");
	const start3 = Date.now();
	const response3 = await ask(
		runner,
		"What was the first country we discussed? Use your memory tool.",
		true,
	);
	const time3 = Date.now() - start3;

	console.log(
		dedent`
		🌍 Country:     ${response3.country}
		📍 Capital:     ${response3.capital}
		👥 Population:  ${response3.population ? response3.population.toLocaleString() : "N/A"}
		📏 Area:        ${response3.area_km2 ? response3.area_km2.toLocaleString() : "N/A"} km²
		💰 Currency:    ${response3.currency || "N/A"}
		🗣️  Languages:   ${response3.languages?.join(", ") || "N/A"}
		🎉 Fun fact:    ${response3.fun_fact}
		⏱️  Response time: ${time3}ms
		`,
	);

	console.log(`\n${"=".repeat(60)}\n`);

	// Fourth query - will trigger cache refresh (exceeds cacheIntervals: 3)
	console.log("🟡 Query 4: Italy (will refresh cache after 3 invocations)");
	const start4 = Date.now();
	const response4 = await ask(
		runner,
		"Tell me about Italy with comprehensive details.",
		true,
	);
	const time4 = Date.now() - start4;

	console.log(
		dedent`
		🌍 Country:     ${response4.country}
		📍 Capital:     ${response4.capital}
		👥 Population:  ${response4.population ? response4.population.toLocaleString() : "N/A"}
		📏 Area:        ${response4.area_km2 ? response4.area_km2.toLocaleString() : "N/A"} km²
		💰 Currency:    ${response4.currency || "N/A"}
		🗣️  Languages:   ${response4.languages?.join(", ") || "N/A"}
		🎉 Fun fact:    ${response4.fun_fact}
		📜 History:     ${response4.historical_note || "N/A"}
		🏛️  Attractions: ${response4.tourist_attractions?.join(", ") || "N/A"}
		⏱️  Response time: ${time4}ms
		`,
	);

	console.log(`\n${"=".repeat(60)}\n`);

	// Performance summary
	const speedup2 = (((time1 - time2) / time1) * 100).toFixed(1);
	const speedup3 = (((time1 - time3) / time1) * 100).toFixed(1);
	const speedup4 = (((time1 - time4) / time1) * 100).toFixed(1);

	console.log("📊 Performance Summary:");
	console.log(`   Query 1 (cache creation):  ${time1}ms (baseline)`);
	console.log(
		`   Query 2 (cached):          ${time2}ms (${speedup2}% ${time2 < time1 ? "faster" : "slower"})`,
	);
	console.log(
		`   Query 3 (cached):          ${time3}ms (${speedup3}% ${time3 < time1 ? "faster" : "slower"})`,
	);
	console.log(
		`   Query 4 (cache refresh):   ${time4}ms (${speedup4}% ${time4 < time1 ? "faster" : "slower"})`,
	);
	console.log(
		"\n💡 Note: Cached queries (2-3) should be significantly faster than",
	);
	console.log("   the initial query and the cache refresh query.");
	console.log(`\n${"=".repeat(60)}`);
}

main().catch(console.error);
