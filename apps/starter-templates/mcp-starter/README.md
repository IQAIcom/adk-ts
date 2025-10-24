
<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>


# MCP Server Starter Template

**A minimal starter template for building Model Context Protocol (MCP) servers using TypeScript and FastMCP.**

_MCP • FastMCP • TypeScript_

---

</div>

A minimal starter template for building Model Context Protocol (MCP) servers using TypeScript and FastMCP.

## Features

* Basic project structure with `src/lib`, `src/services`, `src/tools`.
* TypeScript setup (compiles to `dist/`).
* `fastmcp` for MCP server implementation.
* A weather service example demonstrating:
  * Proper folder structure (lib, services, tools)
  * API integration with error handling
  * Parameter validation using Zod
  * Separation of concerns
* GitHub Actions workflows for CI and Release (manual trigger by default).

## Getting Started

The easiest way to create a new MCP server project using this template is with the ADK CLI:

```bash
npm install -g @iqai/adk-cli # if you haven't already
adk new --template mcp-starter my-mcp-server
cd my-mcp-server
pnpm install
```

You can also use this template directly by copying the files, but using the CLI is recommended for best results.

### Running the Server

**Default (Production/Development) Route**

To run your MCP server in production or for standard development, use:
```bash
pnpm dev
```

**Fast Iteration & Development Testing**

For rapid prototyping and testing your MCP server setup:
```bash
pnpm dev   # Run server in development mode with hot-reloading
```

6. **Configure environment variables:**
   For the weather service example, you'll need an OpenWeather API key:

   ```bash
   # Create a .env file (add to .gitignore)
   echo "OPENWEATHER_API_KEY=your_api_key_here" > .env
   ```

   Get an API key from [OpenWeather](https://openweathermap.org/api).

7. **Initial Commit:**
    It's a good idea to make an initial commit at this stage.

    ```bash
    git add .
    git commit -m "feat: initial project setup from template"
    ```

8. **Develop your server:**
    * Add your custom tools in the `src/tools/` directory.
    * Implement logic in `src/lib/` and `src/services/`.
    * Register tools in `src/index.ts`.

## Example Weather Tool

This template includes a weather service example that demonstrates:

1. **HTTP Utilities** (`src/lib/http.ts`):
   * Type-safe HTTP requests with Zod validation
   * Error handling

2. **Configuration** (`src/lib/config.ts`):
   * Environment variable management
   * Service configuration

3. **Weather Service** (`src/services/weather-service.ts`):
   * API integration
   * Data transformation
   * Proper error propagation

4. **Weather Tool** (`src/tools/weather.ts`):
   * Parameter validation with Zod
   * User-friendly output formatting
   * Error handling and user guidance

To use the weather tool:

```bash
# Set your OpenWeather API key
export OPENWEATHER_API_KEY=your_api_key_here

# Run the server in development mode
pnpm dev

# Or build and run in production mode
pnpm run build
pnpm run start

# Connect with an MCP client and use the GET_WEATHER tool
# with parameter: { "city": "London" }
```

## Release Management (Changesets)

This template is ready for release management using [Changesets](https://github.com/changesets/changesets).

1. **Install Changesets CLI (if not already in devDependencies):**
    The template `package.json` should include `@changesets/cli`. If not:

    ```bash
    pnpm add -D @changesets/cli
    ```

2. **Initialize Changesets:**
    This command will create a `.changeset` directory with some configuration files.

    ```bash
    pnpm changeset init
    # or npx changeset init
    ```

    Commit the generated `.changeset` directory and its contents.

3. **Adding Changesets During Development:**
    When you make a change that should result in a version bump (fix, feature, breaking change):

    ```bash
    pnpm changeset add
    # or npx changeset add
    ```

    Follow the prompts. This will create a markdown file in the `.changeset` directory describing the change.
    Commit this changeset file along with your code changes.

4. **Publishing a Release:**
    The GitHub Actions workflow `release.yml` (in `mcp-server-starter/.github/workflows/`) is set up for this. When you are ready to release:
    * Ensure all feature PRs with their changeset files are merged to `main`.
    * **Important:** Before publishing, ensure your `package.json` is complete. Add or update fields like `keywords`, `author`, `repository` (e.g., `"repository": {"type": "git", "url": "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"}`), `bugs` (e.g., `"bugs": {"url": "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/issues"}`), and `homepage` (e.g., `"homepage": "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME#readme"`) for better discoverability and information on npm.
    * The `release.yml` workflow (manually triggered by default in the template) will:
        1. Run `changeset version` to consume changeset files, update `package.json` versions, and update `CHANGELOG.md`. It will push these to a `changeset-release/main` branch and open a "Version Packages" PR.
        2. **Merge the "Version Packages" PR.**
        3. Upon merging, the workflow runs again on `main`. This time, it will run `pnpm run publish-packages` (which should include `changeset publish`) to publish to npm and create GitHub Releases/tags.
    * **To enable automatic release flow:** Change `on: workflow_dispatch` in `release.yml` to `on: push: branches: [main]` (or your release branch).

## Available Scripts

* `pnpm run build`: Compiles TypeScript to JavaScript in `dist/` and makes the output executable.
* `pnpm run dev`: Runs the server in development mode using `tsx` (hot-reloading for TypeScript).
* `pnpm run start`: Runs the built server (from `dist/`) using Node.

## Testing Your MCP Server

**Option 1: Direct MCP Server Usage**
Use the server directly with MCP clients or integrate it into other applications.

**Option 2: Test with ADK TypeScript (Recommended)**
To test your MCP server with ADK TypeScript, create a separate agent project that consumes your MCP server:

1. **Deploy your MCP server:**
   ```bash
   pnpm dev  # Run your MCP server in development mode
   ```

2. **Create a test agent project:**
   ```bash
   # In a separate directory, create a new ADK project
   npm install -g @iqai/adk-cli
   adk new my-test-agent
   cd my-test-agent
   pnpm install
   ```

3. **Connect to your MCP server using McpToolset:**
   ```typescript
   import { McpToolset, AgentBuilder } from "@iqai/adk";

   // Configure connection to your MCP server
   const mcpConfig = {
     name: "Weather MCP Client",
     description: "Client for weather operations",
     transport: {
       mode: "stdio",
       command: "node",
      args: ["../<your-mcp-server-project>/dist/index.js"], // or the host url
       env: {
         OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
         PATH: process.env.PATH || "",
       },
     },
   };

   // Initialize MCP toolset
   const mcpToolset = new McpToolset(mcpConfig);

   // Get available tools from your MCP server
   const mcpTools = await mcpToolset.getTools();

   // Create agent with MCP tools
   const { runner } = await AgentBuilder.create("weather_agent")
     .withModel("gemini-2.5-flash")
     .withDescription("Agent that can check weather using MCP tools")
     .withTools(...mcpTools)
     .build();

   // Test the integration
   const response = await runner.ask("What's the weather in London?");
   console.log(response);

   // Clean up
   await mcpToolset.close();
   ```

4. **Run your test agent:**
   ```bash
   adk run  # Interactive CLI testing
   adk web  # Web interface for testing
   ```

This approach allows you to test how your MCP server tools work within the ADK ecosystem using the [McpToolset integration](https://adk.iqai.com/docs/framework/tools/mcp-tools#integration-with-adk-typescript).

## Using the Server

After building (`pnpm run build`), you can run the server:

* Directly if linked or globally installed: `mcp-hello-server` (or your customized bin name).
* Via node: `node dist/index.js`
* Via `pnpm dlx` (once published): `pnpm dlx your-published-package-name`
