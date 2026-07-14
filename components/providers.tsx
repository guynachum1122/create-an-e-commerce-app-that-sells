'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { PostHogProvider } from '@/lib/posthog';
import { CartMergeOnLogin } from '@/components/cart/cart-merge-on-login';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <PostHogProvider>
          <CartMergeOnLogin />
          {children}
          <Toaster position="bottom-right" richColors />
        </PostHogProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
