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
			className="group flex flex-col h-full rounded-lg overflow-hidden bg-card/30 hover:bg-card/50 transition-all duration-300 border border-border/40 hover:border-border hover:shadow-lg hover:shadow-primary/5"
		>
			<div className="relative aspect-video w-full overflow-hidden bg-muted/20">
				{image ? (
					<Image
						src={image}
						alt={title}
						fill
						className="object-cover transition-transform duration-500 group-hover:scale-105"
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/20 to-muted/5 group-hover:from-primary/5 group-hover:to-primary/10 transition-colors">
						<div className="text-4xl font-bold text-muted-foreground/20 group-hover:text-primary/30 transition-colors">
							{title.substring(0, 2).toUpperCase()}
						</div>
					</div>
				)}
			</div>

			<div className="flex flex-col flex-grow p-5 gap-3">
				<div>
					<div className="flex items-start justify-between gap-2 mb-2">
						<h3 className="text-lg font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
							{title}
						</h3>
						<ArrowUpRight className="h-4 w-4 text-muted-foreground/50 opacity-0 -translate-y-1 translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 group-hover:text-primary flex-shrink-0" />
					</div>
					{tags.length > 0 && (
						<div className="flex flex-wrap gap-1.5">
							{tags.map((tag) => (
								<span
									key={tag}
									className="text-xs text-muted-foreground/80 bg-muted/40 px-2 py-1 rounded-md"
								>
									{tag}
								</span>
							))}
						</div>
					)}
				</div>

				{description && (
					<p className="line-clamp-2 text-sm text-muted-foreground/70 leading-relaxed">
						{description}
					</p>
				)}
			</div>
		</Link>
	);
}
