import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

interface ProjectCardProps {
	title: string;
	description?: string;
	developer: string;
	link?: string;
	category?: string;
	image?: string;
	developerLink?: string;
}

export function ProjectCard({
	title,
	description,
	developer,
	link = "#",
	category,
	image,
	developerLink,
}: ProjectCardProps) {
	return (
		<div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card/50 transition-all hover:bg-card/80 hover:shadow-lg hover:-translate-y-1">
			<Link href={link} target="_blank" className="absolute inset-0 z-0">
				<span className="sr-only">View {title}</span>
			</Link>
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-1/5 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />

			{image && (
				<div className="relative w-full aspect-video overflow-hidden border-b border-border/50 pointer-events-none">
					<Image
						src={image}
						alt={title}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				</div>
			)}

			<div className="relative z-10 p-6 pointer-events-none">
				<div className="mb-4 flex items-start justify-between">
					<div className="space-y-1">
						{category && (
							<span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
								{category}
							</span>
						)}
						<h3 className="font-semibold text-xl tracking-tight text-foreground">
							{title}
						</h3>
					</div>
					<ExternalLink className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</div>

				{description && (
					<p className="mb-4 text-sm text-muted-foreground line-clamp-2">
						{description}
					</p>
				)}
			</div>

			<div className="relative z-10 mt-auto px-6 pb-6 pt-0 pointer-events-none">
				<div className="flex items-center text-sm text-muted-foreground">
					<span className="font-medium text-foreground mr-1">Built by:</span>
					{developerLink ? (
						<a
							href={developerLink}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline relative z-20 pointer-events-auto"
							onClick={(e) => e.stopPropagation()}
						>
							{developer}
						</a>
					) : (
						<span className="text-primary">{developer}</span>
					)}
				</div>
			</div>
		</div>
	);
}
