import { Plus } from "lucide-react";

export function Hero() {
	return (
		<section className="relative flex flex-col justify-center items-center px-4 sm:px-6 py-20 overflow-hidden">
			{/* Background Effects */}
			<div className="absolute inset-0 bg-background">
				{/* Perspective Grid */}
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
				{/* Pink Glow - centered but lower opacity for clean look */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/20 blur-[120px] rounded-full opacity-40 pointer-events-none" />
			</div>

			{/* Main Content */}
			<div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">
				<div className="space-y-4">
					<h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
						Community Showcase
					</h1>
					<p className="text-lg sm:text-xl text-muted-foreground/80 max-w-2xl mx-auto">
						Discover the innovative AI agents and applications built with{" "}
						<span className="text-foreground font-semibold">ADK-TS</span>
					</p>
				</div>

				<div className="flex justify-center">
					<a
						href="https://github.com/IQAIcom/adk-ts/discussions/404"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 shadow-[0_0_20px_-5px_rgba(236,72,153,0.4)]"
					>
						<Plus className="h-4 w-4" />
						Submit Project
					</a>
				</div>
			</div>
		</section>
	);
}
