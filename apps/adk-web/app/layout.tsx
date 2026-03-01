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
		default: "ADK-TS Web | Visual Web Interface for AI Agent Testing",
		template: "ADK-TS | %s",
	},
	description:
		"Test and monitor your ADK-TS AI agents with a visual web interface. Browse agents, chat in real-time, inspect sessions, and debug agent behavior interactively.",
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
	robots: {
		index: false,
		follow: false,
	},
	icons: {
		icon: "/adk.png",
		shortcut: "/adk.png",
		apple: "/adk.png",
	},
	openGraph: {
		type: "website",
		title: "ADK-TS Web | Visual Web Interface for AI Agent Testing",
		description:
			"Test and monitor your ADK-TS AI agents with a visual web interface. Browse agents, chat in real-time, inspect sessions, and debug agent behavior interactively.",
		url: "https://adk-web.iqai.com",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "ADK-TS Web | Visual Web Interface for AI Agent Testing",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "ADK-TS Web | Visual Web Interface for AI Agent Testing",
		description:
			"Test and monitor your ADK-TS AI agents with a visual web interface. Browse agents, chat in real-time, inspect sessions, and debug agent behavior interactively.",
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
