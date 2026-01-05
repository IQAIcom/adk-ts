import { randomUUID } from "node:crypto";
import {
	AgentBuilder,
	ContextCacheConfig,
	InMemorySessionService,
} from "@iqai/adk";
import { ask } from "../utils";

/**
 * 18 - Context Cache Configuration
 *
 * Demonstrates how context caching automatically improves performance for long
 * conversations. The system caches long message histories at the provider level,
 * reducing latency and costs for subsequent requests.
 *
 * Concepts covered:
 * - Automatic context caching for long conversations
 * - Cache configuration (minTokens, TTL, intervals)
 * - Performance improvements with cached context
 * - Token counting and cache creation thresholds
 *
 * How it works:
 * 1. System tracks token counts from LLM responses
 * 2. Before creating cache, uses Google's countTokens API to verify size
 * 3. Cache created when total tokens (system instruction + history) >= 1024
 * 4. Subsequent requests reuse the cache if fingerprint matches and cache is valid
 * 5. Cache expires after TTL (10 minutes in this example) or max reuse count
 *
 * Expected output:
 * - First 5-6 exchanges: "Cache SKIP: Context too small"
 * - 6th or 7th exchange: "Cache CREATED: New cache established"
 * - Remaining exchanges: "Cache HIT: Using cached context"
 * - Cached requests should be faster than non-cached ones
 */

async function main() {
	console.log("🚀 Context Caching Demo\n");

	const sessionService = new InMemorySessionService();

	// Note: Google requires at least 1024 tokens total (system instruction + message history)
	// for actual caching. The system will automatically count tokens using Google's API
	// before attempting cache creation. Set minTokens to your desired threshold (>= 1024).
	const cacheConfig = new ContextCacheConfig({
		minTokens: 1024, // Google's hard minimum requirement
		ttlSeconds: 600,
		cacheIntervals: 5, // Allow more cache reuse
	});

	// Long instruction to ensure we meet the minimum cache token threshold
	// Google Gemini requires at least 1024 tokens for caching
	const longInstruction = `You are an expert geography assistant with comprehensive knowledge of world capitals, countries, and international geography.

Your role is to provide accurate, informative answers about:
- Capital cities and their countries, including historical capitals and administrative centers
- Geographic locations, coordinates, elevations, and regional positioning
- Population statistics, demographics, growth trends, and urban development patterns
- Historical context including founding dates, colonial history, and significant historical events
- Cultural significance, UNESCO World Heritage sites, and cultural landmarks
- Interesting facts, lesser-known details, and unique characteristics
- Political systems, government structures, and administrative divisions
- Economic information including major industries, trade relationships, and economic indicators
- Climate zones, weather patterns, and environmental features
- Transportation hubs, major airports, ports, and infrastructure
- Language diversity, official languages, and linguistic heritage
- Religious and ethnic composition of populations
- Educational institutions, universities, and research centers
- Tourism attractions, museums, galleries, and entertainment venues
- Architectural styles, urban planning, and city layouts
- Sister city relationships and international partnerships

When answering questions about capitals, always provide:
1. The capital city name with correct spelling and any alternative names
2. The country name with official designation
3. At least one interesting or lesser-known fact about the city that demonstrates your deep knowledge
4. Historical context when relevant to understanding the city's significance

Guidelines for responses:
- Keep answers concise but informative - typically 2-4 sentences
- Use specific numbers, dates, and facts when available
- Mention any recent changes or developments when relevant
- Compare with other major cities when it adds context
- Note any special administrative or political status
- Include pronunciation guidance for difficult names when helpful

Additional context you should be aware of:
- Some countries have multiple capitals (administrative, legislative, judicial)
- Capital cities sometimes move or change throughout history
- Some capitals are planned cities built specifically for government functions
- Population figures and rankings change over time
- Political situations can affect capital city status
- Some territories and regions have contested or unofficial capitals

You have deep expertise in:
- European capitals and their rich historical backgrounds
- Asian capitals and their rapid modernization
- African capitals and their post-colonial development
- American capitals from North to South
- Oceanic capitals and island nations
- Middle Eastern capitals and their ancient heritage

Remember to maintain accuracy while being engaging and educational in your responses.`;

	const { runner } = await AgentBuilder.withModel("gemini-2.5-flash")
		.withInstruction(longInstruction)
		.withSessionService(sessionService)
		.withQuickSession({
			sessionId: randomUUID(),
			appName: "cached-chat",
		})
		.withContextCacheConfig(cacheConfig)
		.build();

	console.log("Building conversation history to meet 1024 token minimum...\n");

	// Build up context with several exchanges (system instruction + conversation history must exceed 1024 tokens)
	// Each exchange adds ~100-150 tokens, so we need several to reach the minimum
	await ask(runner, "What is the capital of France?");
	await ask(runner, "What is the capital of Germany?");
	await ask(runner, "What is the capital of Spain?");
	await ask(runner, "What is the capital of Italy?");
	await ask(runner, "What is the capital of Portugal?");
	await ask(runner, "What is the capital of Austria?");
	await ask(runner, "What is the capital of Poland?");

	console.log(
		"\n✅ Cache should now be established. Testing cached requests:\n",
	);

	// Measure cached request performance
	const times: number[] = [];

	const start1 = Date.now();
	await ask(runner, "What is the capital of Greece?");
	times.push(Date.now() - start1);
	console.log(`\n1. Greece (${times[0]}ms)`);

	const start2 = Date.now();
	await ask(runner, "What is the capital of Netherlands?");
	times.push(Date.now() - start2);
	console.log(`\n2. Netherlands (${times[1]}ms)`);

	const start3 = Date.now();
	await ask(runner, "What is the capital of Belgium?");
	times.push(Date.now() - start3);
	console.log(`\n3. Belgium (${times[2]}ms)`);

	const start4 = Date.now();
	await ask(runner, "What is the capital of Switzerland?");
	times.push(Date.now() - start4);
	console.log(`\n4. Switzerland (${times[3]}ms)`);

	const start5 = Date.now();
	await ask(runner, "What is the capital of Norway?");
	times.push(Date.now() - start5);
	console.log(`\n5. Norway (${times[4]}ms)`);

	// Calculate average response time
	const avgTime = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0);
	console.log(
		`\n💡 Average cached response time: ${avgTime}ms (${times.length} requests)\n`,
	);
}

main().catch(console.error);
