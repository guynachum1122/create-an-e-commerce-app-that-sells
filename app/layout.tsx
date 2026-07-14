import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { ConsentGatedAnalytics } from '@/components/analytics-consent';
import { Providers } from '@/components/providers';
import { defaultMetadata } from '@/lib/seo/metadata';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans`}>
        <Providers>{children}</Providers>
        <ConsentGatedAnalytics />
      </body>
    </html>
  );
}
