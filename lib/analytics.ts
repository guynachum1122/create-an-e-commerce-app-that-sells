'use client';

import { captureEvent as capturePostHog } from '@/lib/posthog';
import { trackMixpanel } from '@/lib/mixpanel';

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  capturePostHog(event, properties);
  trackMixpanel(event, properties);
}

export const AnalyticsEvents = {
  SIGNED_UP: 'signed_up',
  LOGGED_IN: 'logged_in',
  PURCHASE_COMPLETED: 'purchase_completed',
  FEATURE_USED: 'feature_used',
  ADDED_TO_CART: 'added_to_cart',
  ADDED_TO_WISHLIST: 'added_to_wishlist',
  SEARCH_PERFORMED: 'search_performed',
} as const;
