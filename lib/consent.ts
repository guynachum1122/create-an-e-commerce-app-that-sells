/** Shared cookie consent helpers — single localStorage key across all analytics */

export const CONSENT_KEY = 'cookie_consent';
export const CONSENT_VERSION = '1.0';

export type CookieConsent = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  consentedAt: string;
};

export function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CookieConsent;
    if (typeof parsed.analytics !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  const consent = parseConsent(localStorage.getItem(CONSENT_KEY));
  return consent?.analytics === true;
}

export function buildConsent(analytics: boolean, marketing: boolean): CookieConsent {
  return {
    essential: true,
    analytics,
    marketing,
    version: CONSENT_VERSION,
    consentedAt: new Date().toISOString(),
  };
}
