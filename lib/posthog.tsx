'use client';

import posthog from 'posthog-js';
import { useEffect, type ReactNode } from 'react';
import { hasAnalyticsConsent } from '@/lib/consent';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY || !hasAnalyticsConsent()) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
    });
  }, []);

  return <>{children}</>;
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return;
  posthog.identify(userId, traits);
}
