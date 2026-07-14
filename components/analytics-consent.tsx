'use client';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useEffect, useState } from 'react';

import { CONSENT_KEY, parseConsent } from '@/lib/consent';

export function ConsentGatedAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(parseConsent(localStorage.getItem(CONSENT_KEY))?.analytics === true);
    const onStorage = () => setEnabled(parseConsent(localStorage.getItem(CONSENT_KEY))?.analytics === true);
    window.addEventListener('storage', onStorage);
    window.addEventListener('cookie-consent-updated', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cookie-consent-updated', onStorage);
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
