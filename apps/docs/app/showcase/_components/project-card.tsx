import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

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
		<div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card/50 transition-all hover:bg-card/80 hover:shadow-lg hover:-translate-y-1">
			<Link
				href={link}
				target="_blank"
				rel="noopener noreferrer"
				className="absolute inset-0 z-0"
			>
				<span className="sr-only">View {title}</span>
			</Link>
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-1/5 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />

			{image ? (
				<div className="relative w-full aspect-video overflow-hidden border-b border-border/50 pointer-events-none">
					<Image
						src={image}
						alt={title}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-105"
						loading="lazy"
						placeholder="blur"
						blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmX/9k="
					/>
				</div>
			) : (
				<div className="relative w-full aspect-video overflow-hidden border-b border-border/50 pointer-events-none bg-gradient-to-br from-primary/20 to-chart-1/20 flex items-center justify-center p-6">
					<h3 className="font-bold text-2xl text-center text-foreground/80 tracking-tight">
						{title}
					</h3>
				</div>
			)}

			<div className="relative z-10 p-6 pointer-events-none">
				<div className="mb-4 flex items-start justify-between">
					<div className="space-y-1">
						<div className="flex flex-wrap gap-2 mb-2">
							{tags.map((tag) => (
								<span
									key={tag}
									className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
								>
									{tag}
								</span>
							))}
						</div>
						<h3 className="font-semibold text-xl tracking-tight text-foreground">
							{title}
						</h3>
					</div>
					<ExternalLink
						className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
						aria-label={`View ${title}`}
					/>
				</div>

				{description && (
					<p className="mb-4 text-sm text-muted-foreground line-clamp-2">
						{description}
					</p>
				)}
			</div>
		</div>
	);
}
