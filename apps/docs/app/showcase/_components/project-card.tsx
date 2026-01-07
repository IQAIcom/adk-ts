import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ProjectCardProps {
	title: string;
	description?: string;
	link?: string;
	tags?: string[];
	image?: string;
}

export function ProjectCard({
	title,
	description,
	link = "#",
	tags = [],
	image,
}: ProjectCardProps) {
	return (
		<Link
			href={link}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex flex-col h-full rounded-xl border border-border bg-card/40 hover:bg-card/60 transition-all duration-300 overflow-hidden"
		>
			<div className="relative aspect-video w-full overflow-hidden border-b border-border/50 bg-muted/10">
				{image ? (
					<Image
						src={image}
						alt={title}
						fill
						className="object-cover transition-transform duration-500 group-hover:scale-105"
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-background to-muted/20 group-hover:to-primary/5 transition-colors">
						<div className="text-3xl font-bold text-muted-foreground/10 group-hover:text-primary/20 transition-colors">
							{title.substring(0, 2).toUpperCase()}
						</div>
					</div>
				)}
			</div>

			<div className="flex flex-col flex-grow p-6 gap-3">
				<div>
					<div className="flex items-start justify-between gap-2">
						<h3 className="text-lg font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
							{title}
						</h3>
						<ArrowUpRight className="h-5 w-5 text-muted-foreground/50 opacity-0 -translate-y-1 translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 group-hover:text-primary" />
					</div>
					{tags.length > 0 && (
						<div className="flex flex-wrap gap-2 mt-2">
							{tags.map((tag) => (
								<span
									key={tag}
									className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/50"
								>
									{tag}
								</span>
							))}
						</div>
					)}
				</div>

				{description && (
					<p className="line-clamp-2 text-sm text-muted-foreground/80 leading-relaxed">
						{description}
					</p>
				)}
			</div>
		</Link>
	);
}
