// CLI implementation for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the CLI functionality from the Python SDK

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import type {
  BaseArtifactService,
  InMemoryArtifactService,
} from "../artifacts";
import { Runner } from "../runners";
import { loadDotEnvForAgent } from "./utils/envs";

/**
 * Input file model for batch processing
 */
interface InputFile {
  state: Record<string, any>;
  queries: string[];
}

/**
 * Runs an agent with queries from an input file
 *
 * @param appName The application name
 * @param rootAgent The root agent to run
 * @param artifactService The artifact service to use
 * @param session The session to use
 * @param sessionService The session service to use
 * @param inputPath The path to the input file
 */
export async function runInputFile(
  appName: string,
  rootAgent: LlmAgent,
  artifactService: BaseArtifactService,
  session: Session,
  sessionService: BaseSessionService,
  inputPath: string,
): Promise<void> {
  const runner = new Runner({
    appName,
    agent: rootAgent,
    artifactService,
    sessionService,
  });

  const inputFileContent = fs.readFileSync(inputPath, "utf-8");
  const inputFile = JSON.parse(inputFileContent) as InputFile;

  inputFile.state._time = new Date();
  session.state = inputFile.state;

  for (const query of inputFile.queries) {
    console.log(`user: ${query}`);
    const content = {
      role: "user",
      parts: [{ text: query }],
    };

    for await (const event of runner.runAsync(
      session.userId,
      session.id,
      content,
    )) {
      if (event.getContent()) {
        const parts = event.getContent()?.parts || [];
        const text = parts
          .filter((part) => part.text)
          .map((part) => part.text)
          .join("");

        if (text) {
          console.log(`[${event.getAuthor()}]: ${text}`);
        }
      }
    }
  }
}

/**
 * Runs an agent interactively
 *
 * @param appName The application name
 * @param rootAgent The root agent to run
 * @param artifactService The artifact service to use
 * @param session The session to use
 * @param sessionService The session service to use
 */
export async function runInteractively(
  appName: string,
  rootAgent: LlmAgent,
  artifactService: BaseArtifactService,
  session: Session,
  sessionService: BaseSessionService,
): Promise<void> {
  const runner = new Runner({
    appName,
    agent: rootAgent,
    artifactService,
    sessionService,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = (): Promise<string> => {
    return new Promise((resolve) => {
      rl.question("user: ", (answer) => {
        resolve(answer);
      });
    });
  };

  while (true) {
    const query = await promptUser();
    if (query === "exit") {
      break;
    }

    const content = {
      role: "user",
      parts: [{ text: query }],
    };

    for await (const event of runner.runAsync({
      userId: session.userId,
      sessionId: session.id,
      newMessage: content,
    })) {
      if (event.getContent()) {
        const parts = event.getContent()?.parts || [];
        const text = parts
          .filter((part) => part.text)
          .map((part) => part.text)
          .join("");

        if (text) {
          console.log(`[${event.getAuthor()}]: ${text}`);
        }
      }
    }
  }

  rl.close();
}

/**
 * Interface for run CLI options
 */
export interface RunCliOptions {
  agentParentDir: string;
  agentFolderName: string;
  jsonFilePath?: string;
  saveSession: boolean;
}

/**
 * Runs the CLI with the given options
 *
 * @param options The options for running the CLI
 */
export async function runCli(options: RunCliOptions): Promise<void> {
  const { agentParentDir, agentFolderName, jsonFilePath, saveSession } =
    options;

  // Add the agent parent directory to the module search path if needed
  // This is a Node.js-specific implementation for handling module imports

  const artifactService = new InMemoryArtifactService();
  const sessionService = new InMemorySessionService();
  const session = sessionService.createSession(agentFolderName, "test_user");

  try {
    // This is a simplistic approach - in a real implementation,
    // we would need more sophisticated module loading and integration
    const agentModulePath = path.join(agentParentDir, agentFolderName);
    // In TypeScript we'd use a dynamic import approach instead of importlib
    const agentModule = await import(agentModulePath);
    const rootAgent = agentModule.agent.rootAgent as LlmAgent;

    // Load environment variables for the agent
    loadDotEnvForAgent(agentFolderName, agentParentDir);

    if (jsonFilePath) {
      if (jsonFilePath.endsWith(".input.json")) {
        await runInputFile(
          agentFolderName,
          rootAgent,
          artifactService,
          session,
          sessionService,
          jsonFilePath,
        );
      } else if (jsonFilePath.endsWith(".session.json")) {
        const sessionFileContent = fs.readFileSync(jsonFilePath, "utf-8");
        const sessionData = JSON.parse(sessionFileContent);
        const loadedSession = new Session(sessionData);

        for (const content of loadedSession.getContents()) {
          if (content.role === "user") {
            console.log("user: ", content.parts[0].text);
          } else {
            console.log(content.parts[0].text);
          }
        }

        await runInteractively(
          agentFolderName,
          rootAgent,
          artifactService,
          loadedSession,
          sessionService,
        );
      } else {
        console.log(`Unsupported file type: ${jsonFilePath}`);
        process.exit(1);
      }
    } else {
      console.log(`Running agent ${rootAgent.name}, type exit to exit.`);
      await runInteractively(
        agentFolderName,
        rootAgent,
        artifactService,
        session,
        sessionService,
      );
    }

    if (saveSession) {
      let sessionPath: string;
      if (jsonFilePath) {
        sessionPath = jsonFilePath.replace(".input.json", ".session.json");
      } else {
        // In Node.js, we'd use a different approach for getting user input
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const sessionId = await new Promise<string>((resolve) => {
          rl.question("Session ID to save: ", (answer) => {
            resolve(answer);
            rl.close();
          });
        });

        sessionPath = path.join(agentModulePath, `${sessionId}.session.json`);
      }

      // Fetch the session again to get all the details
      const updatedSession = sessionService.getSession(
        session.appName,
        session.userId,
        session.id,
      );

      if (updatedSession) {
        fs.writeFileSync(sessionPath, JSON.stringify(updatedSession, null, 2));
        console.log("Session saved to", sessionPath);
      }
    }
  } catch (error) {
    console.error("Error running CLI:", error);
    process.exit(1);
  }
}
