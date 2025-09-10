import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

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
		default: "ADK Web - Visual Interface for ADK CLI",
		template: "%s | ADK Web",
	},
	description:
		"Visual web interface for @iqai/adk-cli to discover agents, chat, and monitor your ADK server.",
	metadataBase: new URL("https://adk-web.iqai.com"),
	applicationName: "ADK Web",
	keywords: [
		"ADK",
		"Agent Development Kit",
		"AI agents",
		"CLI web interface",
		"LLM",
		"TypeScript",
	],
	authors: [{ name: "IQAI" }],
	creator: "IQAI",
	publisher: "IQAI",
	category: "technology",
	icons: {
		icon: "/adk.png",
		shortcut: "/adk.png",
		apple: "/adk.png",
	},
	openGraph: {
		type: "website",
		title: "ADK Web - Visual Interface for ADK CLI",
		description:
			"Visual web interface for @iqai/adk-cli to discover agents, chat, and monitor your ADK server.",
		url: "https://adk-web.iqai.com",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "ADK Web - Visual Interface for ADK CLI",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "ADK Web - Visual Interface for ADK CLI",
		description:
			"Visual web interface for @iqai/adk-cli to discover agents, chat, and monitor your ADK server.",
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
					<QueryProvider>{children}</QueryProvider>
				</ThemeProvider>
				<Toaster />
			</body>
		</html>
	);
}
