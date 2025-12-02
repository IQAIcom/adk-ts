export function Hero() {
	return (
		<section className="relative flex flex-col justify-center items-center px-2 sm:px-4 py-16 sm:py-24 overflow-hidden">
			{/* Enhanced Background */}
			<div className="absolute inset-0 bg-gradient-to-br from-background via-card to-muted/20">
				<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-2/5" />

				{/* Enhanced floating orbs */}
				<div className="absolute top-8 left-8 w-24 sm:w-32 h-24 sm:h-32 bg-primary/20 rounded-full blur-2xl animate-pulse opacity-30" />
				<div className="absolute bottom-8 right-8 w-32 sm:w-40 h-32 sm:h-40 bg-chart-1/20 rounded-full blur-2xl animate-pulse opacity-30 animation-delay-2000" />
				<div className="absolute top-1/2 left-1/4 w-16 h-16 bg-chart-2/15 rounded-full blur-xl animate-ping opacity-20 animation-delay-4000" />

				{/* Subtle grid pattern */}
				<div className="absolute inset-0 bg-grid-pattern opacity-5" />

				{/* Moving gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
			</div>

			{/* Main content - centered */}
			<div className="relative z-10 w-full max-w-4xl mx-auto text-center">
				{/* Header section with animations */}
				<div className="mb-8 animate-fade-in-up">
					<div
						className="inline-flex items-center bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-6 hover:bg-primary/15 transition-all duration-300 hover:scale-105"
						role="presentation"
					>
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
						Community Showcase
					</div>

					<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 animate-fade-in-up animation-delay-200">
						<span className="text-foreground">Built with</span>
						<br />
						<span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
							ADK-TS Framework
						</span>
					</h1>

					<p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up animation-delay-400">
						Discover the innovative AI agents and applications created by our
						amazing community.
					</p>
				</div>
			</div>

			{/* Enhanced CSS animations */}
			<style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0);
          background-size: 24px 24px;
        }

        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-600 { animation-delay: 0.6s; }
        .animation-delay-800 { animation-delay: 0.8s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
		</section>
	);
}
