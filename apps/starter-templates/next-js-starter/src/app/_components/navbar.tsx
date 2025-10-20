import { Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const Navbar = () => {
	return (
		<nav className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
			<div className="flex items-center gap-2 font-semibold text-lg">
				<Image
					src="/dark-adk.png"
					alt="ADK-TS"
					width={30}
					height={30}
					className="rounded-lg"
				/>
				<span>ADK-TS</span>
			</div>
			<Link
				href="https://adk.iqai.com/docs/framework/get-started"
				target="_blank"
				rel="noopener noreferrer"
				className={buttonVariants({
					size: "sm",
					className: "hidden sm:flex items-center gap-2",
				})}
			>
				<Zap className="w-4 h-4" />
				Get Started
			</Link>
		</nav>
	);
};
