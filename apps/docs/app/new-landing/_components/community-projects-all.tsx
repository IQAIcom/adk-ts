"use client";

import { ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { projects } from "@/app/showcase/_schema";
import { SectionWrapper } from "./section-wrapper";

const CommunityProjectAllSection = () => {
	return (
		<SectionWrapper id="all-projects" className="relative p-0!">
			<ul
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 -mx-px -my-px"
				aria-label="Community showcase projects"
			>
				{projects.map((project, index) => (
					<motion.li
						key={project.title}
						className="border border-white/10 -ml-px -mt-px p-4 py-8 md:p-7 md:py-16"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
					>
						<article className="h-full">
							<Link
								href={project.link}
								target="_blank"
								rel="noopener noreferrer"
								className="group block h-full border border-white/20 rounded-md bg-[#0A0A0A] space-y-3 p-4 md:p-5 hover:border-white/20 transition-all duration-300"
								aria-label={`${project.title} — ${project.description.slice(0, 80)}`}
							>
								<div className="space-y-1">
									<h3 className="text-base md:text-lg font-bold text-white group-hover:text-primary transition-colors duration-300">
										{project.title}
									</h3>
									<p className="text-xs md:text-sm text-white/60 leading-relaxed line-clamp-2 mb-6">
										{project.description}
									</p>
								</div>

								{/* Tags */}
								<ul
									className="flex flex-wrap gap-x-3 gap-y-1"
									aria-label="Tags"
								>
									{project.tags.map((tag) => (
										<li
											key={tag}
											className="px-3 py-1 text-xs border border-white/10 text-neutral-400"
										>
											{tag}
										</li>
									))}
								</ul>

								{/* View link */}
								<div
									className="flex items-center gap-2 text-muted-foreground group-hover:text-white/70 transition-colors text-xs mb-8"
									aria-hidden="true"
								>
									<svg
										width="16"
										height="16"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<title>GitHub</title>
										<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
									</svg>
									<span>View code</span>
									<ExternalLink className="size-4" aria-hidden="true" />
								</div>

								{/* Cover image */}
								<div className="relative rounded-md overflow-hidden border border-white/20 aspect-3/2 p-4 md:p-5">
									{project.image ? (
										<Image
											src={project.image}
											alt={`Screenshot of ${project.title}`}
											fill
											className="object-cover transition-transform duration-500 group-hover:scale-105"
											sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
											loading="lazy"
										/>
									) : (
										<div
											className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted/20 to-muted/5 group-hover:from-primary/5 group-hover:to-primary/10 transition-colors"
											aria-hidden="true"
										>
											<div className="text-4xl font-bold text-muted-foreground/20 group-hover:text-primary/30 transition-colors">
project.title.slice(0, 2).toUpperCase()
											</div>
										</div>
									)}
								</div>
							</Link>
						</article>
					</motion.li>
				))}
			</ul>
		</SectionWrapper>
	);
};

export default CommunityProjectAllSection;
