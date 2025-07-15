import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions: BaseLayoutProps = {
	nav: {
		title: (
			<>
				<img
					alt="TypeScript"
					height={30}
					src="/adk.png"
					style={{ verticalAlign: "middle", marginRight: 2, borderRadius: 8 }}
					width={30}
				/>
				ADK-TS
			</>
		),
	},
	githubUrl: "https://github.com/IQAICOM/adk-ts",
};
