import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import dedent from 'dedent';

export function CodeExample() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Build Agents in One Line
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AgentBuilder's fluent interface eliminates boilerplate and lets you focus on building intelligent agents.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Simple yet Powerful</h3>
              <p className="text-muted-foreground">
                From one-line agents to complex multi-agent workflows, AgentBuilder scales with your needs.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">1</div>
                <span className="text-foreground">Install @iqai/adk package</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">2</div>
                <span className="text-foreground">Choose your LLM provider</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">3</div>
                <span className="text-foreground">Start building agents</span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>Supported Model providers:</strong> OpenAI, Google, Anthropic, AI SDK models and more</p>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <DynamicCodeBlock
                lang="typescript"
                code={dedent`
                  import { AgentBuilder } from '@iqai/adk';

                  // One-line agent creation
                  const response = await AgentBuilder
                    .withModel("gemini-2.5-flash")
                    .ask("What is the primary function of an AI agent?");

                  // Agent with session and tools
                  const { agent, runner, session } = await AgentBuilder
                    .create("my_assistant")
                    .withModel("gpt-4.1")
                    .withDescription("A helpful AI assistant")
                    .withInstruction("Provide concise responses.")
                    .withTools(new GoogleSearch(), new HttpRequestTool())
                    .build();

                  // Multi-agent workflow
                  const workflow = await AgentBuilder
                    .create("research_workflow")
                    .asSequential([researchAgent, summaryAgent])
                    .build();
                `}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}