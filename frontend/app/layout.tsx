import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'AI Search Engine',
    template: '%s | AI Search Engine'
  },
  description: 'A powerful AI-powered search engine with RAG capabilities',
  keywords: ['AI', 'Search', 'RAG', 'Vector Search', 'Machine Learning'],
  authors: [{ name: 'AI Search Engine Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`h-full bg-gray-50 ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
