import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "ADK-TS Web - Visual Interface for the ADK-TS CLI",
		template: "%s | ADK-TS Web",
	},
	description:
		"Visual web interface for @iqai/adk-cli to discover, chat with, and monitor your ADK-TS AI agents.",
	metadataBase: new URL("https://adk-web.iqai.com"),
	applicationName: "ADK-TS Web",
	keywords: [
		"ADK-TS",
		"TypeScript AI agents",
		"AI agent web interface",
		"AI agent testing",
		"LLM",
		"TypeScript agent framework",
	],
	authors: [{ name: "IQ AI" }],
	creator: "IQ AI",
	publisher: "IQ AI",
	category: "technology",
	icons: {
		icon: "/adk.png",
		shortcut: "/adk.png",
		apple: "/adk.png",
	},
	openGraph: {
		type: "website",
		title: "ADK-TS Web - Visual Interface for the ADK-TS CLI",
		description:
			"Visual web interface for @iqai/adk-cli to discover, chat with, and monitor your ADK-TS AI agents.",
		url: "https://adk-web.iqai.com",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "ADK-TS Web - Visual Interface for the ADK-TS CLI",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "ADK-TS Web - Visual Interface for the ADK-TS CLI",
		description:
			"Visual web interface for @iqai/adk-cli to discover, chat with, and monitor your ADK-TS AI agents.",
		images: ["/og-image.png"],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				suppressHydrationWarning
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<NuqsAdapter>
						<QueryProvider>{children}</QueryProvider>
					</NuqsAdapter>
				</ThemeProvider>
				<Toaster />
			</body>
		</html>
	);
}
