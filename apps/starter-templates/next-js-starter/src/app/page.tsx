import { Code2, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Navbar } from "./_components/navbar";
import { Demo } from "./demo/demo";

export default function Home() {
	return (
		<>
			<Navbar />
			<div className="min-h-screen bg-background flex flex-col justify-center">
				<main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-20 sm:pb-24">
					<div className="max-w-4xl mx-auto text-center">
						<div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-accent border border-border mb-6 sm:mb-8">
							<Sparkles className="w-4 h-4 text-primary" />
							<span className="text-xs sm:text-sm font-medium text-muted-foreground">
								Agent Development Kit for TypeScript
							</span>
						</div>
						<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 tracking-tight leading-tight">
							Build{" "}
							<span className="bg-linear-to-r from-primary to-pink-400 bg-clip-text text-transparent">
								Intelligent Agents
							</span>{" "}
							with ADK-TS
						</h1>

						<p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
							A comprehensive TypeScript framework for building sophisticated AI
							agents with multi-LLM support, advanced tools, and flexible
							conversation flows.
						</p>

						<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center flex-wrap">
							<div className="w-full sm:w-auto">
								<Demo />
							</div>
							<Link
								href="https://adk.iqai.com/docs/framework/get-started"
								target="_blank"
								rel="noopener noreferrer"
								className={buttonVariants({
									size: "lg",
									variant: "secondary",
									className:
										"flex items-center gap-2 w-full sm:w-auto justify-center",
								})}
							>
								<Zap className="w-5 h-5" />
								Get Started
							</Link>

							<Link
								href="https://adk.iqai.com/"
								target="_blank"
								rel="noopener noreferrer"
								className={buttonVariants({
									size: "lg",
									variant: "outline",
									className:
										"flex items-center gap-2 w-full sm:w-auto justify-center",
								})}
							>
								<Code2 className="w-5 h-5" />
								View Documentation
							</Link>
						</div>
					</div>
				</main>
			</div>
		</>
	);
}
