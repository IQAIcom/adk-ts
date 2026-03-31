import { SectionWrapper } from "./section-wrapper";

const models = [
	"Google Gemini",
	"Anthropic",
	"OpenAI",
	"Mistral",
	"Vercel AI SDK",
	"OpenRouter",
];

export default function LLMModels() {
	return (
		<SectionWrapper id="llm-models" className="py-0! px-0! lg:py-8! bg-black">
			<div className="llm-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
				{models.map((model, index) => {
					const isLastRow2 = index >= 4;
					const isLastRow3 = index >= 3;
					const isLastItem = index === models.length - 1;

					return (
						<div
							key={model}
							className={[
								"flex items-center justify-center px-4 py-5 sm:py-6 text-sm sm:text-base font-medium text-muted-foreground",
								// Real border-r on lg only (inset vertical pseudo handles sm/md via CSS)
								isLastItem ? "" : "lg:border-r lg:border-white/20",
								// Horizontal rules: full-width, touch edges
								isLastRow2 ? "" : "border-b border-white/20",
								isLastRow3 ? "md:border-b-0" : "",
								"lg:border-b-0",
							].join(" ")}
						>
							<div className="p-2.5 sm:p-4.5 md:py-0">{model}</div>
						</div>
					);
				})}
			</div>
		</SectionWrapper>
	);
}
