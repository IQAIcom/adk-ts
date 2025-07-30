import * as fs from "node:fs";
import * as path from "node:path";
import { intro, outro, select, text, note, spinner } from "@clack/prompts";
import chalk from "chalk";
import { VERSION } from "../index";

const AGENT_TS_TEMPLATE = `import { env } from "node:process";
import { FunctionTool, LlmAgent } from "@iqai/adk";
import dedent from "dedent";

// --- Tool Functions ---

/**
 * Gets the current weather for a specified city
 * @param city The city to get weather for
 * @returns Weather information for the city
 */
async function getWeather(city: string): Promise<Record<string, any>> {
  console.log(\`Getting weather for: \${city}\`);
  
  // Mock weather data - replace with real API call
  const weatherData: Record<string, any> = {
    newyork: { temperature: "25°C", condition: "sunny", humidity: "60%" },
    london: { temperature: "15°C", condition: "cloudy", humidity: "75%" },
    tokyo: { temperature: "18°C", condition: "light rain", humidity: "80%" }
  };
  
  const normalizedCity = city.toLowerCase().replace(/\s+/g, "");
  return weatherData[normalizedCity] || { 
    error: \`Weather data not available for \${city}\` 
  };
}

/**
 * Gets the current local time and timezone
 * @returns Current time information
 */
function getCurrentTime(): Record<string, any> {
  console.log("Getting current time");
  const now = new Date();
  return {
    currentTime: now.toLocaleTimeString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    date: now.toLocaleDateString()
  };
}

// --- Create Function Tools ---

function createTools() {
  const weatherTool = new FunctionTool(getWeather, {
    name: "get_weather",
    description: "Gets current weather information for a city",
  });

  const timeTool = new FunctionTool(getCurrentTime, {
    name: "get_current_time",
    description: "Gets the current local time and timezone",
  });

  return [weatherTool, timeTool];
}

// --- Agent Definition ---

export const rootAgent = new LlmAgent({
  name: "{agent_name}",
  model: env.LLM_MODEL || "{model_name}",
  description: "A helpful assistant that can provide weather and time information",
  instruction: dedent\`
    You are a helpful assistant that can check the weather and get the current time.
    Use the get_weather tool for weather queries and the get_current_time tool for time queries.
    Provide clear and informative responses based on the tool results.
  \`,
  tools: createTools(),
});

// --- Main Function (Optional - for standalone execution) ---

async function main() {
  console.log(dedent\`
    🤖 {agent_name} Agent Started
    ═══════════════════════════════
    
    📝 Agent: {agent_name}
    🤖 Model: \${env.LLM_MODEL || "{model_name}"}
    
    This agent can help with weather and time information!
    To interact with this agent, use:
    - npx adk run {agent_name}
    - npx adk web {agent_name}
  \`);
}

// Run main if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
`;

const PACKAGE_JSON_TEMPLATE = `{
  "name": "adk-project",
  "version": "1.0.0",
  "description": "Project with agents created with ADK TypeScript",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@iqai/adk": "^${VERSION}",
    "dotenv": "^16.5.0",
    "dedent": "^1.6.0"
  },
  "devDependencies": {
    "tsx": "^4.19.4",
    "typescript": "^5.3.2",
    "@types/node": "^20.17.30"
  },
  "engines": {
    "node": ">=18.0"
  }
}
`;

const TSCONFIG_JSON_TEMPLATE = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node16",
    "resolveJsonModule": true,
    "declaration": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
`;

const GOOGLE_API_MSG = `\nDon't have API Key? Create one in AI Studio: https://aistudio.google.com/apikey\n`;
const GOOGLE_CLOUD_SETUP_MSG =
	"\nYou need an existing Google Cloud account and project, check out this link for details:\nhttps://google.github.io/adk-docs/get-started/quickstart/#gemini---google-cloud-vertex-ai\n";
const OTHER_MODEL_MSG =
	"\nPlease see below guide to configure other models:\nhttps://google.github.io/adk-docs/agents/models\n";
const SUCCESS_MSG = `\nAgent project created successfully!

Project structure:
├── .env                    # Environment variables
├── package.json            # Shared dependencies  
├── tsconfig.json          # TypeScript configuration
├── {agent_name}/          # Your agent folder
│   └── agent.ts           # Agent definition

Next steps:
1. npm install              # Install dependencies
2. npm run build            # Build the project
3. npx adk run {agent_name}  # Run your agent in terminal
4. npx adk web {agent_name}  # OR try the dev UI in browser

To add more agents: create new folders with agent.ts files!
`;

async function promptStr(
	promptPrefix: string,
	priorMsg?: string,
	defaultValue?: string,
): Promise<string> {
	if (priorMsg) {
		note(priorMsg);
	}

	const value = await text({
		message: promptPrefix,
		defaultValue: defaultValue || "",
		placeholder: defaultValue || "Enter value...",
	});

	if (typeof value === "string") {
		return value.trim() || defaultValue || "";
	}
	return defaultValue || "";
}

async function promptForGoogleCloud(
	googleCloudProject?: string,
): Promise<string> {
	const defaultProject =
		googleCloudProject || process.env.GOOGLE_CLOUD_PROJECT || "";
	return promptStr("Enter Google Cloud project ID", undefined, defaultProject);
}

async function promptForGoogleCloudRegion(
	googleCloudRegion?: string,
): Promise<string> {
	const defaultRegion =
		googleCloudRegion || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
	return promptStr("Enter Google Cloud region", undefined, defaultRegion);
}

async function promptForGoogleApiKey(googleApiKey?: string): Promise<string> {
	const defaultApiKey = googleApiKey || process.env.GOOGLE_API_KEY || "";
	return promptStr("Enter Google API key", GOOGLE_API_MSG, defaultApiKey);
}

async function promptForModel(): Promise<string> {
	const modelChoice = await select({
		message: "Choose a model for the root agent",
		options: [
			{
				value: "gemini-2.0-flash",
				label: "Gemini 2.0 Flash",
				hint: "Recommended",
			},
			{ value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
			{
				value: "<FILL_IN_MODEL>",
				label: "Other models",
				hint: "Configure later",
			},
		],
		initialValue: "gemini-2.0-flash",
	});

	if (modelChoice === "<FILL_IN_MODEL>") {
		note(OTHER_MODEL_MSG);
	}

	return typeof modelChoice === "string" ? modelChoice : "gemini-2.0-flash";
}

async function promptToChooseBackend(
	googleApiKey?: string,
	googleCloudProject?: string,
	googleCloudRegion?: string,
): Promise<{
	googleApiKey?: string;
	googleCloudProject?: string;
	googleCloudRegion?: string;
}> {
	const backendChoice = await select({
		message: "Choose a backend",
		options: [
			{ value: "google-ai", label: "Google AI", hint: "Requires API key" },
			{ value: "vertex-ai", label: "Vertex AI", hint: "Requires GCP project" },
		],
		initialValue: "google-ai",
	});

	if (backendChoice === "google-ai") {
		const finalGoogleApiKey = await promptForGoogleApiKey(googleApiKey);
		return { googleApiKey: finalGoogleApiKey };
	}
	if (backendChoice === "vertex-ai") {
		note(GOOGLE_CLOUD_SETUP_MSG);
		const finalGoogleCloudProject =
			await promptForGoogleCloud(googleCloudProject);
		const finalGoogleCloudRegion =
			await promptForGoogleCloudRegion(googleCloudRegion);
		return {
			googleCloudProject: finalGoogleCloudProject,
			googleCloudRegion: finalGoogleCloudRegion,
		};
	}

	// Default fallback to Google AI
	const finalGoogleApiKey = await promptForGoogleApiKey(googleApiKey);
	return { googleApiKey: finalGoogleApiKey };
}

/**
 * Sanitizes an agent name to use only alphanumeric characters and underscores
 * @param name The original agent name
 * @returns Sanitized name with non-alphanumeric characters replaced with underscores
 */
function sanitizeAgentName(name: string): string {
	// Replace any non-alphanumeric character (except underscores) with underscores
	return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

async function generateFiles(
	agentName: string,
	opts: {
		googleApiKey?: string;
		googleCloudProject?: string;
		googleCloudRegion?: string;
		model?: string;
	},
) {
	const currentDir = process.cwd();
	const agentFolder = path.join(currentDir, agentName);

	const rootPackageJsonPath = path.join(currentDir, "package.json");
	const rootTsconfigJsonPath = path.join(currentDir, "tsconfig.json");

	const hasPackageJson = fs.existsSync(rootPackageJsonPath);
	const hasTsconfigJson = fs.existsSync(rootTsconfigJsonPath);

	// --- Create Agent-Specific Files ---
	const srcFolder = path.join(agentFolder, "src");
	await fs.promises.mkdir(srcFolder, { recursive: true });

	const agentFilePath = path.join(srcFolder, "index.ts");
	const agentCode = AGENT_TS_TEMPLATE.replace(
		/{model_name}/g,
		opts.model || "gemini-2.0-flash",
	).replace(/{agent_name}/g, agentName);
	await fs.promises.writeFile(agentFilePath, agentCode, "utf-8");

	// Create agent-specific .env file
	const dotenvFilePath = path.join(agentFolder, ".env");
	const envLines: string[] = [];
	if (opts.googleApiKey) {
		envLines.push("GOOGLE_GENAI_USE_VERTEXAI=0");
		envLines.push(`GOOGLE_API_KEY=${opts.googleApiKey}`);
	} else if (opts.googleCloudProject && opts.googleCloudRegion) {
		envLines.push("GOOGLE_GENAI_USE_VERTEXAI=1");
		envLines.push(`GOOGLE_CLOUD_PROJECT=${opts.googleCloudProject}`);
		envLines.push(`GOOGLE_CLOUD_LOCATION=${opts.googleCloudRegion}`);
	}
	await fs.promises.writeFile(dotenvFilePath, envLines.join("\n"), "utf-8");

	// --- Create Root-Level Project Files (if they don't exist) ---
	if (!hasPackageJson) {
		await fs.promises.writeFile(
			rootPackageJsonPath,
			PACKAGE_JSON_TEMPLATE,
			"utf-8",
		);
	}

	if (hasTsconfigJson) {
		console.warn(`
[ADK] WARNING: An existing tsconfig.json was found.
The ADK requires specific compiler options to function correctly.
Please ensure your tsconfig.json includes the following settings:

  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "node16",
    "outDir": "./dist",
    ...
  },
  "include": ["**/*.ts"]`);
	} else {
		await fs.promises.writeFile(
			rootTsconfigJsonPath,
			TSCONFIG_JSON_TEMPLATE,
			"utf-8",
		);
	}

	// --- Log Success Message ---
	if (!hasPackageJson) {
		console.log(`
ADK project initialized and agent '${agentName}' created.

Project structure:
- package.json
- tsconfig.json
- ${agentName}/
  - src/
    - index.ts
  - .env

Directory created:
- ${agentName}/
  - src/
    - index.ts
  - .env

Next steps:
1. Install dependencies:
   npm install

2. Build the project (if you made changes):
   npm run build

3. Run your new agent:
   npx adk run ${agentName}

4. Or try the dev UI in browser:
   npx adk web ${agentName}`);
	}
}

export async function runCmd({
	agentName,
	model,
	googleApiKey,
	googleCloudProject,
	googleCloudRegion,
}: {
	agentName: string;
	model?: string;
	googleApiKey?: string;
	googleCloudProject?: string;
	googleCloudRegion?: string;
}) {
	intro(chalk.cyan(`🚀 Creating new ADK agent: ${chalk.bold(agentName)}`));

	// Sanitize the agent name
	const sanitizedAgentName = sanitizeAgentName(agentName);
	if (sanitizedAgentName !== agentName) {
		note(
			`Agent name has been sanitized from "${agentName}" to "${sanitizedAgentName}" (only alphanumeric characters and underscores allowed)`,
		);
	}

	if (!model) {
		model = await promptForModel();
	}

	const s = spinner();
	s.start("Configuring backend...");

	// Stop spinner before interactive prompts to prevent visual conflicts
	s.stop("Choose backend options");

	const backend = await promptToChooseBackend(
		googleApiKey,
		googleCloudProject,
		googleCloudRegion,
	);

	// No need for another spinner stop here since it's already stopped above

	s.start("Generating agent files...");
	await generateFiles(sanitizedAgentName, {
		googleApiKey: backend.googleApiKey,
		googleCloudProject: backend.googleCloudProject,
		googleCloudRegion: backend.googleCloudRegion,
		model,
	});
	s.stop("Files generated");

	outro(chalk.green(`✅ Agent "${sanitizedAgentName}" created successfully!`));
}
