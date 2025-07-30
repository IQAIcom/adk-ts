import * as fs from "node:fs";
import * as path from "node:path";
import * as child_process from "node:child_process";

const DOCKERFILE_TEMPLATE = `
FROM node:18-slim
WORKDIR /app

# Create a non-root user
RUN adduser --disabled-password --gecos "" myuser

# Change ownership of /app to myuser
RUN chown -R myuser:myuser /app

# Switch to the non-root user
USER myuser

# Set up environment variables - Start
ENV PATH="/home/myuser/.local/bin:$PATH"

ENV GOOGLE_GENAI_USE_VERTEXAI=1
ENV GOOGLE_CLOUD_PROJECT={gcp_project_id}
ENV GOOGLE_CLOUD_LOCATION={gcp_region}

# Set up environment variables - End

# Install pnpm and tsx globally
RUN npm install -g pnpm tsx

# Install ADK - Start
RUN pnpm install -g @iqai/adk@{adk_version}
# Install ADK - End

# Copy agent - Start
COPY "agents/{app_name}/" "/app/agents/{app_name}/"
{install_agent_deps}
# Copy agent - End

EXPOSE {port}

CMD npx tsx -e "
const { {start_function} } = require('/usr/local/lib/node_modules/@iqai/adk/src/cli/{server_file}');
{start_function}({
  agentDir: '/app/agents/{app_name}',
  port: {port},
  allowOrigins: ['*'],
  {additional_options}
});
"
`;

async function resolveProject(projectInOption?: string): Promise<string> {
	if (projectInOption) return projectInOption;
	try {
		const result = child_process.spawnSync(
			"gcloud",
			["config", "get-value", "project"],
			{
				encoding: "utf-8",
			},
		);
		if (result.status === 0 && result.stdout) {
			const project = result.stdout.trim();
			console.log(`Use default project: ${project}`);
			return project;
		}
	} catch (e) {
		console.log("Error getting default project:", e);
	}
	throw new Error("Could not resolve Google Cloud project.");
}

export async function toCloudRun({
	agentFolder,
	project,
	region,
	serviceName,
	appName,
	tempFolder,
	port,
	traceToCloud,
	withUi,
	verbosity,
	sessionDbUrl,
	adkVersion,
}: {
	agentFolder: string;
	project?: string;
	region?: string;
	serviceName: string;
	appName: string;
	tempFolder: string;
	port: number;
	traceToCloud: boolean;
	withUi: boolean;
	verbosity: string;
	sessionDbUrl?: string;
	adkVersion: string;
}) {
	appName = appName || path.basename(agentFolder);
	console.log(`Start generating Cloud Run source files in ${tempFolder}`);
	// Remove tempFolder if exists
	if (fs.existsSync(tempFolder)) {
		console.log("Removing existing files");
		fs.rmSync(tempFolder, { recursive: true, force: true });
	}
	try {
		// Copy agent source code
		console.log("Copying agent source code...");
		const agentSrcPath = path.join(tempFolder, "agents", appName);
		fs.mkdirSync(path.dirname(agentSrcPath), { recursive: true });
		copyDir(agentFolder, agentSrcPath);
		const packageJsonPath = path.join(agentSrcPath, "package.json");
		const installAgentDeps = fs.existsSync(packageJsonPath)
			? `WORKDIR /app/agents/${appName}
RUN pnpm install
WORKDIR /app`
			: "";
		console.log("Copying agent source code complete.");
		// Create Dockerfile
		console.log("Creating Dockerfile...");
		const serverConfig = withUi
			? {
					startFunction: "startWebServer",
					serverFile: "web-server",
					additionalOptions: "",
				}
			: {
					startFunction: "createApiServer",
					serverFile: "api-server",
					additionalOptions: "web: false,",
				};

		const dockerfileContent = DOCKERFILE_TEMPLATE.replace(
			/{gcp_project_id}/g,
			project || "",
		)
			.replace(/{gcp_region}/g, region || "")
			.replace(/{app_name}/g, appName)
			.replace(/{port}/g, String(port))
			.replace(/{start_function}/g, serverConfig.startFunction)
			.replace(/{server_file}/g, serverConfig.serverFile)
			.replace(/{additional_options}/g, serverConfig.additionalOptions)
			.replace(/{install_agent_deps}/g, installAgentDeps)
			.replace(/{adk_version}/g, adkVersion);
		const dockerfilePath = path.join(tempFolder, "Dockerfile");
		fs.mkdirSync(tempFolder, { recursive: true });
		await fs.promises.writeFile(dockerfilePath, dockerfileContent, "utf-8");
		console.log(`Creating Dockerfile complete: ${dockerfilePath}`);
		// Deploy to Cloud Run
		console.log("Deploying to Cloud Run...");
		const regionOptions = region ? ["--region", region] : [];
		const resolvedProject = await resolveProject(project);
		child_process.execFileSync(
			"gcloud",
			[
				"run",
				"deploy",
				serviceName,
				"--source",
				tempFolder,
				"--project",
				resolvedProject,
				...regionOptions,
				"--port",
				String(port),
				"--verbosity",
				verbosity,
				"--labels",
				"created-by=adk",
			],
			{ stdio: "inherit" },
		);
	} finally {
		console.log(`Cleaning up the temp folder: ${tempFolder}`);
		fs.rmSync(tempFolder, { recursive: true, force: true });
	}
}

function copyDir(src: string, dest: string) {
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}
