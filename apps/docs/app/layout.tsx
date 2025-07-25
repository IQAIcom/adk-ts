import '@/app/global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'ADK TypeScript - Agent Development Kit',
    template: '%s | ADK TypeScript'
  },
  description: 'Comprehensive framework for building sophisticated AI agents with multi-LLM support, advanced tool integration, memory systems, and flexible conversation flows.',
  metadataBase: new URL('https://adk.iqai.com'),
  icons: {
    icon: '/adk.png',
    shortcut: '/adk.png',
    apple: '/adk.png'
  },
  openGraph: {
    type: 'website',
    title: 'ADK TypeScript - Agent Development Kit',
    description: 'Comprehensive framework for building sophisticated AI agents with multi-LLM support, advanced tool integration, memory systems, and flexible conversation flows.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ADK TypeScript - Agent Development Kit'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADK TypeScript - Agent Development Kit',
    description: 'Comprehensive framework for building sophisticated AI agents with multi-LLM support, advanced tool integration, memory systems, and flexible conversation flows.',
    images: ['/og-image.png']
  }
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
