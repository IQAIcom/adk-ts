import { SectionWrapper } from "./section-wrapper";

const models = [
	"Google Gemini",
	"Anthropic",
	"OpenAI",
	"Mistral",
	"Vercel AI SDK",
	"OpenRouter",
];

export default function LLMModels({
	transparent = false,
}: {
	transparent?: boolean;
}) {
	return (
		<SectionWrapper
			id="llm-models"
			className={`py-0! px-0! lg:py-8! ${transparent ? "" : "bg-black"}`}
		>
			<h2 className="sr-only">Supported LLM Providers</h2>
			<ul
				className="llm-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
				aria-label="Supported LLM providers"
			>
				{models.map((model, index) => {
					const isLastRow2 = index >= 4;
					const isLastRow3 = index >= 3;
					const isLastItem = index === models.length - 1;

					return (
						<li
							key={model}
							className={[
								"flex items-center justify-center px-4 py-5 sm:py-6 text-sm sm:text-base md:text-lg font-medium text-muted-foreground",
								isLastItem ? "" : "lg:border-r lg:border-white/20",
								isLastRow2 ? "" : "border-b border-white/20",
								isLastRow3 ? "md:border-b-0" : "",
								"lg:border-b-0",
							].join(" ")}
						>
							<div className="p-2.5 sm:p-4.5 md:py-0">{model}</div>
						</li>
					);
				})}
			</ul>
		</SectionWrapper>
	);
}
