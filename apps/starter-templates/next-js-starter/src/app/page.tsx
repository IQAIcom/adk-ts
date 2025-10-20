import { Bot, Code2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
	return (
		<div className="min-h-screen bg-background flex flex-col justify-center">
			<main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-6">
						<Sparkles className="w-4 h-4 text-primary" />
						<span className="text-sm font-medium text-muted-foreground">
							Agent Development Kit for TypeScript
						</span>
					</div>

					<h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
						Build{" "}
						<span className="bg-gradient-to-r from-primary to-pink-400 bg-clip-text text-transparent">
							Intelligent Agents
						</span>{" "}
						with ADK-TS
					</h1>

					<p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
						A comprehensive TypeScript framework for building sophisticated AI
						agents with multi-LLM support, advanced tools, and flexible
						conversation flows.
					</p>

					<div className="flex gap-4 justify-center flex-wrap">
						<Button size="lg" className="flex items-center gap-2">
							<Zap className="w-5 h-5" />
							Get Started
						</Button>

						<Button
							size="lg"
							variant="secondary"
							className="flex items-center gap-2"
						>
							<Code2 className="w-5 h-5" />
							View Documentation
						</Button>

						<Button
							size="lg"
							variant="outline"
							className="flex items-center gap-2 border-primary hover:bg-accent/80"
						>
							<Bot className="w-5 h-5" />
							Try Demo
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
