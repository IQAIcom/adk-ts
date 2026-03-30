import Image from "next/image";
import { SectionWrapper } from "./section-wrapper";

const BuiltForDevelopersSection = () => {
	return (
		<SectionWrapper id="built-for-developers" className="landing-glow">
			{/* Section header */}
			<div className="landing-section-header">
				<span className="landing-badge">Developer Experience</span>
				<h2>Built for Developers</h2>
				<p>TypeScript-first . Full IntelliSense . Zero Configuration</p>
			</div>

			{/* Code snippet + DX highlights */}
			<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 lg:gap-8 border">
				<Image
					src="/landing-page/built-for-dev-1.svg"
					alt="Code snippet showing AgentBuilder API with IntelliSense"
					width={799}
					height={468}
					className="w-full h-auto"
				/>
				<Image
					src="/landing-page/built-for-devs-2.svg"
					alt="DX Highlights: IntelliSense, Zod schemas, zero boilerplate, starter templates, CLI, hot reload, examples, ESM support"
					width={385}
					height={468}
					className="w-full h-auto"
				/>
			</div>

			{/* Terminal command */}
			<div
				className="mt-3.5 bg-[#0A0A0A99] px-5 py-3 font-mono text-xs text-white/80 flex items-center gap-3 border border-white/10 rounded-md"
				style={{ boxShadow: "0px 4px 4px 0px #00000040" }}
			>
				<span className="text-primary text-[11px]">$</span>
				<span>
					npx @iqai/adk-cli new my-agent{" "}
					<span className="text-white/40"># project ready in &lt;3s</span>
				</span>
			</div>
		</SectionWrapper>
	);
};

export default BuiltForDevelopersSection;
