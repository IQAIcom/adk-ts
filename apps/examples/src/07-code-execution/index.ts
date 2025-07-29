import { env } from "node:process";
import { InMemorySessionService, LlmAgent, Runner, AgentBuilder } from "@iqai/adk";
import { BuiltInCodeExecutor } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";
import dedent from "dedent";

/**
 * 07 - Code Execution
 *
 * Learn how to enable agents to write and execute code dynamically.
 * This powerful capability allows agents to solve problems by generating
 * and running code in real-time, making them incredibly versatile for
 * computational tasks.
 *
 * Concepts covered:
 * - BuiltInCodeExecutor for Python code execution
 * - Mathematical problem solving with code
 * - Data analysis and visualization
 * - Dynamic algorithm implementation
 * - Error handling in code execution
 * - Code safety and security considerations
 */

const APP_NAME = "code-executor-example";
const USER_ID = uuidv4();

async function demonstrateBasicCodeExecution() {
	console.log("📝 Part 1: Basic Code Execution");
	console.log("═══════════════════════════════════\n");

	// Create a basic code execution agent
	const codeAgent = new LlmAgent({
		name: "code_agent",
		model: env.LLM_MODEL || "gemini-2.0-flash",
		description: "A coder agent that can execute Python code",
		instruction: dedent`
			You are a coding assistant that can write and execute Python code.
			When given mathematical problems or computational tasks, write Python code to solve them.
			Always show your work with code and explain the results clearly.
			Make sure to import any necessary libraries and handle potential errors.
		`,
		codeExecutor: new BuiltInCodeExecutor(),
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	const sessionService = new InMemorySessionService();
	const { runner } = await AgentBuilder.create("code_executor")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Agent with code execution capabilities")
		.withInstruction(dedent`
			You are a code execution assistant. Execute Python code to solve problems.
			Write clean, well-commented code and explain your results.
			Make sure to import any necessary libraries and handle potential errors.
		`)
		.withCodeExecutor(new BuiltInCodeExecutor())
		.withSessionService(sessionService, {
			userId: USER_ID,
			appName: APP_NAME,
		})
		.build();

	console.log("🧮 Testing basic mathematical computation:");
	const mathProblem = "Calculate the sum of squares of all prime numbers less than 100";
	console.log(`Problem: ${mathProblem}`);
	
	const mathResult = await runner.ask(mathProblem);
	console.log(`\nResult: ${mathResult}\n`);

	console.log("📊 Testing data manipulation:");
	const dataTask = "Generate a list of the first 10 Fibonacci numbers and calculate their average";
	console.log(`Task: ${dataTask}`);
	
	const dataResult = await runner.ask(dataTask);
	console.log(`\nResult: ${dataResult}\n`);
}

async function demonstrateDataAnalysis() {
	console.log("📝 Part 2: Data Analysis with Code");
	console.log("═══════════════════════════════════\n");

	const dataAnalyst = new LlmAgent({
		name: "data_analyst",
		model: env.LLM_MODEL || "gemini-2.0-flash",
		description: "A data analysis specialist that can process and analyze data",
		instruction: dedent`
			You are a data analyst who can write Python code to analyze data.
			When given data analysis tasks:
			1. Generate or use provided sample data
			2. Perform appropriate statistical analysis
			3. Create visualizations when helpful
			4. Provide clear insights and interpretations
			5. Use libraries like pandas, numpy, matplotlib as needed
		`,
		codeExecutor: new BuiltInCodeExecutor(),
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	const sessionService = new InMemorySessionService();
	const { runner } = await AgentBuilder.create("data_analyst")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Data analysis specialist with code execution")
		.withInstruction(dedent`
			You are a data analysis specialist. When given data tasks:
			1. Write Python code to process and analyze data
			2. Perform appropriate statistical analysis
			3. Create visualizations when helpful
			4. Provide clear insights and interpretations
			5. Use libraries like pandas, numpy, matplotlib as needed
		`)
		.withCodeExecutor(new BuiltInCodeExecutor())
		.withSessionService(sessionService, {
			userId: USER_ID,
			appName: APP_NAME,
		})
		.build();

	console.log("📈 Testing statistical analysis:");
	const statsTask = dedent`
		Create a dataset of 100 random sales figures (between 1000 and 10000),
		then calculate:
		1. Mean, median, and mode
		2. Standard deviation
		3. 95th percentile
		4. Identify any outliers
	`;
	console.log(`Task: ${statsTask}`);
	
	const statsResult = await runner.ask(statsTask);
	console.log(`\nResult: ${statsResult}\n`);

	console.log("🔍 Testing pattern analysis:");
	const patternTask = dedent`
		Generate a time series dataset representing website traffic over 30 days
		with some seasonal patterns (higher on weekends) and analyze:
		1. Daily average traffic
		2. Weekend vs weekday patterns
		3. Week-over-week growth trends
		4. Create a simple forecast for next week
	`;
	console.log(`Task: ${patternTask}`);
	
	const patternResult = await runner.ask(patternTask);
	console.log(`\nResult: ${patternResult}\n`);
}

async function demonstrateAlgorithmImplementation() {
	console.log("📝 Part 3: Algorithm Implementation");
	console.log("═══════════════════════════════════\n");

	const algorithmExpert = new LlmAgent({
		name: "algorithm_expert",
		model: env.LLM_MODEL || "gemini-2.0-flash", 
		description: "An algorithm specialist that implements and tests algorithms",
		instruction: dedent`
			You are an algorithm expert who can implement various algorithms and data structures.
			When given algorithmic problems:
			1. Explain the approach and time/space complexity
			2. Implement the algorithm in clean, well-commented Python code
			3. Test the implementation with multiple test cases
			4. Analyze the performance characteristics
			5. Suggest optimizations when applicable
		`,
		codeExecutor: new BuiltInCodeExecutor(),
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	const sessionService = new InMemorySessionService();
	const { runner } = await AgentBuilder.create("algorithm_expert")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Algorithm implementation specialist")
		.withInstruction(dedent`
			You are an algorithm implementation specialist. For algorithm tasks:
			1. Explain the algorithm's approach and complexity
			2. Implement the algorithm in clean, well-commented Python code
			3. Test the implementation with multiple test cases
			4. Analyze the performance characteristics
			5. Suggest optimizations when applicable
		`)
		.withCodeExecutor(new BuiltInCodeExecutor())
		.withSessionService(sessionService, {
			userId: USER_ID,
			appName: APP_NAME,
		})
		.build();

	console.log("🔄 Testing sorting algorithm:");
	const sortTask = dedent`
		Implement the quicksort algorithm and test it with:
		1. A random unsorted list of 20 numbers
		2. An already sorted list
		3. A reverse sorted list
		4. A list with duplicate elements
		
		Compare the performance and explain the results.
	`;
	console.log(`Task: ${sortTask}`);
	
	const sortResult = await runner.ask(sortTask);
	console.log(`\nResult: ${sortResult}\n`);

	console.log("🌳 Testing graph algorithm:");
	const graphTask = dedent`
		Implement Dijkstra's shortest path algorithm and use it to find
		the shortest path in a graph representing a simple road network:
		
		Cities: A, B, C, D, E
		Roads with distances:
		A-B: 4, A-C: 2, B-C: 1, B-D: 5, C-D: 8, C-E: 10, D-E: 2
		
		Find the shortest path from A to E and explain the algorithm's steps.
	`;
	console.log(`Task: ${graphTask}`);
	
	const graphResult = await runner.ask(graphTask);
	console.log(`\nResult: ${graphResult}\n`);
}

async function demonstrateInteractiveCodeSession() {
	console.log("📝 Part 4: Interactive Code Session");
	console.log("════════════════════════════════════\n");

	// Create an interactive coding agent using AgentBuilder
	const { runner } = await AgentBuilder.create("interactive_coder")
		.withModel(env.LLM_MODEL || "gemini-2.0-flash")
		.withDescription("An interactive coding assistant for collaborative problem solving")
		.withInstruction(dedent`
			You are an interactive coding assistant that helps solve problems step by step.
			You can write and execute Python code to:
			- Solve mathematical problems
			- Implement algorithms
			- Analyze data
			- Create visualizations
			- Test hypotheses

			Always:
			1. Explain your approach before coding
			2. Write clear, commented code
			3. Test your solutions
			4. Explain the results
			5. Suggest improvements or next steps
		`)
		.withCodeExecutor(new BuiltInCodeExecutor())
		.build();

	// Multi-step problem solving
	console.log("🎯 Multi-step problem solving session:");
	console.log("Problem: Analyze the efficiency of different search algorithms\n");

	const step1 = await runner.ask(dedent`
		Let's start by implementing linear search and binary search algorithms.
		Create both functions and test them with a sorted list of 1000 numbers.
		Measure the time taken for each to find a target number.
	`);
	console.log("Step 1 - Algorithm Implementation:");
	console.log(`${step1}\n`);

	const step2 = await runner.ask(dedent`
		Now let's create a comprehensive performance comparison.
		Test both algorithms with different list sizes (100, 1000, 10000 elements)
		and create a performance chart showing how search time scales with list size.
	`);
	console.log("Step 2 - Performance Analysis:");
	console.log(`${step2}\n`);

	const step3 = await runner.ask(dedent`
		Finally, analyze the theoretical vs actual performance:
		1. Calculate the theoretical time complexities
		2. Compare with our measured results
		3. Explain any discrepancies
		4. Discuss when to use each algorithm
	`);
	console.log("Step 3 - Theoretical Analysis:");
	console.log(`${step3}\n`);
}

async function demonstrateCodeSafetyPatterns() {
	console.log("📝 Part 5: Code Safety and Best Practices");
	console.log("═══════════════════════════════════════\n");

	console.log(dedent`
		🛡️ Code Execution Safety and Best Practices:

		**Security Considerations:**

		🔒 **Sandboxing**
		   - Code runs in isolated environment
		   - Limited access to system resources
		   - No network access by default
		   - File system restrictions

		⚠️ **Input Validation**
		   - Validate all user inputs
		   - Sanitize code before execution
		   - Check for malicious patterns
		   - Limit execution time and memory

		**Performance Optimization:**

		⚡ **Execution Limits**
		   - Set timeout for long-running code
		   - Monitor memory usage
		   - Limit output size
		   - Cache results when appropriate

		📊 **Resource Management**
		   - Clean up temporary files
		   - Manage process lifecycle
		   - Monitor system resources
		   - Implement rate limiting

		**Error Handling:**

		🐛 **Graceful Failures**
		   - Catch and handle exceptions
		   - Provide meaningful error messages
		   - Log errors for debugging
		   - Fallback to alternative approaches

		🔧 **Debugging Support**
		   - Include debug information
		   - Support step-by-step execution
		   - Provide code inspection tools
		   - Enable interactive debugging

		**Best Practices:**

		✅ **Code Quality**
		   - Write clean, readable code
		   - Include comprehensive comments
		   - Use meaningful variable names
		   - Follow Python best practices

		📚 **Documentation**
		   - Document algorithm choices
		   - Explain complex logic
		   - Provide usage examples
		   - Include performance notes

		🧪 **Testing**
		   - Test with edge cases
		   - Validate output format
		   - Check error conditions
		   - Verify performance requirements

		**Use Cases:**

		✨ **Ideal For:**
		   - Mathematical computations
		   - Data analysis tasks
		   - Algorithm implementation
		   - Educational demonstrations
		   - Rapid prototyping

		⚠️ **Avoid For:**
		   - File system modifications
		   - Network operations
		   - System administration
		   - Production deployments
	`);
}

async function main() {
	console.log("💻 07 - Code Execution");
	console.log("═════════════════════\n");

	try {
		await demonstrateBasicCodeExecution();
		await demonstrateDataAnalysis();
		await demonstrateAlgorithmImplementation();
		await demonstrateInteractiveCodeSession();
		await demonstrateCodeSafetyPatterns();

		console.log("✅ Code Execution examples completed!");
		console.log("\n🎓 Key Takeaways:");
		console.log("- Code execution enables dynamic problem solving");
		console.log("- Agents can implement algorithms and analyze data");
		console.log("- Interactive sessions support complex workflows");
		console.log("- Safety and security are paramount considerations");

		console.log("\n🎓 Next Steps:");
		console.log("- Run example 08-external-integrations for system connectivity");
		console.log("- Try building computational agents for your domain");
		console.log("- Experiment with different code execution patterns");

	} catch (error) {
		console.error("❌ Error in code execution example:", error);
		process.exit(1);
	}
}

main().catch(console.error);
