import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

export const baseOptions: BaseLayoutProps = {
	nav: {
		title: (
			<>
				<Image
					src="/adk.png"
					alt="TypeScript"
					width={30}
					height={30}
					style={{ verticalAlign: "middle", marginRight: 2, borderRadius: 8 }}
				/>
				ADK-TS
			</>
		),
	},
	githubUrl: "https://github.com/IQAICOM/adk-ts",
};
