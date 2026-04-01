import { SectionWrapper } from "./section-wrapper";

const steps = [
	{
		step: "01",
		label: "Installation",
		labelColor: "text-primary",
		title: "Install ADK-TS",
		description: "Initialize a new project using the ADK-TS CLI.",
		code: [
			{ text: "npx @iqai/adk-cli new my-agent", color: "text-[#98C379]" },
			{ text: "cd my-agent", color: "text-white/70" },
			{ text: "pnpm install", color: "text-white/70" },
		],
	},
	{
		step: "02",
		label: "Configuration",
		labelColor: "text-[#4ADE80]",
		title: "Configure Your Agent",
		description:
			"Choose any supported model and add instructions, tools, or sub-agents.",
		code: [
			{
				text: "import { AgentBuilder, GoogleSearchTool,",
				color: "text-[#C678DD]",
			},
			{
				text: '  LoadMemoryTool } from "@iqai/adk";',
				color: "text-[#C678DD]",
			},
			{ text: "", color: "" },
			{ text: "const { runner } = await", color: "text-[#E5C07B]" },
			{
				text: '  AgentBuilder.create("researcher_agent")',
				color: "text-[#61AFEF]",
			},
			{ text: '    .withModel("gpt-4.1")', color: "text-[#98C379]" },
			{
				text: '    .withDescription("A helpful research',
				color: "text-[#98C379]",
			},
			{ text: '      assistant")', color: "text-[#98C379]" },
			{
				text: '    .withInstruction("Gather information',
				color: "text-[#98C379]",
			},
			{
				text: '      and summarize findings.")',
				color: "text-[#98C379]",
			},
			{
				text: "    .withTools(new GoogleSearchTool(),",
				color: "text-[#61AFEF]",
			},
			{
				text: "      new LoadMemoryTool())",
				color: "text-[#61AFEF]",
			},
			{ text: "    .build();", color: "text-[#ABB2BF]" },
		],
	},
	{
		step: "03",
		label: "Run and Interact",
		labelColor: "text-[#64C8FF]",
		title: "Interact with your Agent",
		description:
			"Use the ADK-TS CLI to run your agent locally with hot-reload and an interactive interface.",
		code: [
			{
				text: "# Terminal-based interaction with hot-reload",
				color: "text-white/30",
			},
			{ text: "# during development", color: "text-white/30" },
			{ text: "adk run", color: "text-[#98C379]" },
			{ text: "", color: "" },
			{
				text: "# Launch web interface for visual agent",
				color: "text-white/30",
			},
			{ text: "# development and testing", color: "text-white/30" },
			{ text: "adk web", color: "text-[#98C379]" },
		],
	},
];

const GetStartedSection = () => {
	return (
		<SectionWrapper id="get-started">
			{/* Section header */}
			<div className="landing-section-header">
				<span className="landing-badge">Getting Started</span>
				<h2>Create Your First Agent in Minutes</h2>
				<p>
					Start with a simple agent or scale to a full multi-agent system using
					the same strongly-typed AgentBuilder API.
				</p>
			</div>

			{/* Step cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{steps.map((step) => (
					<div
						key={step.step}
						className="border border-white/20 rounded-md px-2 py-1 bg-black/60 flex flex-col"
					>
						{/* Step header */}
						<div className="py-7 space-y-4.5">
							<div className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
								<span className="text-neutral-400">Step {step.step}</span>
								<span className="text-white/20">—</span>
								<span className="text-primary">{step.label}</span>
							</div>
							<h3 className="text-xl font-bold text-foreground">
								{step.title}
							</h3>
							<p className="text-xs text-muted-foreground font-medium leading-relaxed">
								{step.description}
							</p>
						</div>

						{/* Code block */}
						<div className="border-t border-white/20 px-4 py-7 font-mono text-xs leading-[1.8] overflow-x-auto">
							{step.code.map((line) => (
								<div
									key={`${step.step}-${line.text.slice(0, 20)}`}
									className="text-[#05DF72CC]"
								>
									{line.text || "\u00A0"}
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</SectionWrapper>
	);
};

export default GetStartedSection;
