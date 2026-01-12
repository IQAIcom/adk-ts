export function Hero() {
	return (
		<section className="relative flex flex-col justify-center items-center px-4 sm:px-6 py-20 overflow-hidden">
			{/* Background Effects */}
			<div className="absolute inset-0 bg-background">
				{/* Perspective Grid */}
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
				{/* Pink Glow - centered but lower opacity for clean look */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-75 bg-primary/20 blur-[120px] rounded-full opacity-40 pointer-events-none" />
			</div>

			{/* Main Content */}
			<div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">
				<div className="space-y-4">
					{/* Pill Badge */}
					<div className="inline-flex items-center bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4 hover:bg-primary/15 transition-all duration-300 hover:scale-105">
						<svg
							className="w-3.5 h-3.5 mr-2 animate-pulse"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Star Icon</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
							/>
						</svg>
						Community Projects
					</div>

					<h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
						Community Showcase
					</h1>
					<p className="text-lg sm:text-xl text-muted-foreground/80 max-w-2xl mx-auto">
						Discover the innovative AI agents and applications built with{" "}
						<span className="text-foreground font-semibold">ADK-TS</span>
					</p>
				</div>
			</div>
		</section>
	);
}
