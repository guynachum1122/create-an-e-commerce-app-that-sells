'use client';

import mixpanel from 'mixpanel-browser';
import { hasAnalyticsConsent } from '@/lib/consent';

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
let initialized = false;

function ensureInit() {
  if (initialized || !TOKEN || typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return;
  try {
    mixpanel.init(TOKEN, { debug: false, track_pageview: true });
    initialized = true;
  } catch {
    // no-op
  }
}

export function trackMixpanel(event: string, properties?: Record<string, unknown>) {
  if (!TOKEN) return;
  try {
    ensureInit();
    if (initialized) mixpanel.track(event, properties);
  } catch {
    // never throw
  }
}

export function identifyMixpanel(userId: string, traits?: Record<string, unknown>) {
  if (!TOKEN) return;
  try {
    ensureInit();
    if (initialized) {
      mixpanel.identify(userId);
      if (traits) mixpanel.people.set(traits);
    }
  } catch {
    // no-op
  }
}
