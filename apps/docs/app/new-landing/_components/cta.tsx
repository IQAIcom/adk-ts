import { ArrowRight } from "lucide-react";
import { FadeInView } from "./fade-in-view";
import Image from "next/image";
import Link from "next/link";
import { SectionWrapper } from "./section-wrapper";

const CTASection = () => {
	return (
		<SectionWrapper id="cta">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-[90px] items-center">
				{/* CTA image */}
				<FadeInView
					className="relative order-2 lg:order-1 max-w-lg mx-auto"
					delay={0.2}
				>
					<Image
						src="/landing-page/cta.svg"
						alt="Agent Builder — from NPM install to production deploy"
						width={500}
						height={400}
						className="w-full h-auto"
						loading="lazy"
						sizes="(max-width: 1024px) 90vw, 500px"
					/>
				</FadeInView>

				{/* CTA content */}
				<FadeInView className="space-y-8 order-1 lg:order-2">
					<div className="space-y-5">
						<h2 className="text-2xl md:text-5xl text-white font-bold tracking-tight max-w-md">
							Ready to Build Your First Agent?
						</h2>
						<p className="text-sm md:text-base text-muted-foreground max-w-xl">
							Start building production-ready AI agents in TypeScript with full
							control over tools, workflows, and runtime behaviour.
						</p>
					</div>
					<div className="flex flex-wrap gap-7">
						<Link
							href="/docs"
							className="inline-flex text-sm lg:text-base items-center gap-2 py-2.5 px-3 lg:px-5 lg:py-4.5 rounded-md bg-primary text-white font-medium transition-colors hover:bg-primary/90 leading-0"
						>
							Read the Docs
							<ArrowRight className="size-4" />
						</Link>
						<Link
							href="https://github.com/IQAIcom/adk-ts-samples"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex  text-sm lg:text-base items-center gap-2 py-2.5 px-3 lg:px-5 lg:py-4.5 rounded-md border border-[#D1D5DB] text-white font-medium transition-colors hover:bg-white/5 shadow-[inset_0px_1px_1px_0px_#FFFFFF59,inset_0px_-2px_2px_0px_#8D8D8D0F]"
						>
							Explore Templates
						</Link>
					</div>
				</FadeInView>
			</div>
		</SectionWrapper>
	);
};

export default CTASection;
