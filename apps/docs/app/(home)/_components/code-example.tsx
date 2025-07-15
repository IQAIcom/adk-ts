import dedent from "dedent";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

export function CodeExample() {
	return (
		<section className="px-4 py-16">
			<div className="mx-auto max-w-6xl">
				<div className="mb-12 text-center">
					<h2 className="mb-4 font-bold text-3xl text-foreground md:text-4xl">
						Build Agents in One Line
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
						AgentBuilder's fluent interface eliminates boilerplate and lets you
						focus on building intelligent agents.
					</p>
				</div>

				<div className="grid items-start gap-8 lg:grid-cols-2">
					<div className="space-y-6">
						<div className="space-y-4">
							<h3 className="font-semibold text-foreground text-xl">
								Simple yet Powerful
							</h3>
							<p className="text-muted-foreground">
								From one-line agents to complex multi-agent workflows,
								AgentBuilder scales with your needs.
							</p>
						</div>

						<div className="space-y-3">
							<div className="flex items-center space-x-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
									1
								</div>
								<span className="text-foreground">
									Install @iqai/adk package
								</span>
							</div>
							<div className="flex items-center space-x-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
									2
								</div>
								<span className="text-foreground">
									Choose your LLM provider
								</span>
							</div>
							<div className="flex items-center space-x-3">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
									3
								</div>
								<span className="text-foreground">Start building agents</span>
							</div>
						</div>

						<div className="text-muted-foreground text-sm">
							<p>
								<strong>Supported Models:</strong> GPT-4, Claude-3.5-Sonnet,
								Gemini-2.5-Flash, and more
							</p>
						</div>
					</div>

					<div className="min-w-0 overflow-hidden">
						<div className="w-full overflow-x-auto">
							<DynamicCodeBlock
								code={dedent`
                  import { AgentBuilder } from '@iqai/adk';

                  // One-line agent creation
                  const response = await AgentBuilder
                    .withModel("gemini-2.5-flash")
                    .ask("What is the primary function of an AI agent?");

                  // Agent with session and tools
                  const { agent, runner, session } = await AgentBuilder
                    .create("my_assistant")
                    .withModel("gpt-4")
                    .withDescription("A helpful AI assistant")
                    .withInstruction("Provide concise responses.")
                    .withTools(new GoogleSearch(), new HttpRequestTool())
                    .withQuickSession("my-app", "user-123")
                    .build();

                  // Multi-agent workflow
                  const workflow = await AgentBuilder
                    .create("research_workflow")
                    .asSequential([researchAgent, summaryAgent])
                    .build();
                `}
								lang="typescript"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
