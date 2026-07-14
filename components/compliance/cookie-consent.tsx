'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';

import { CONSENT_KEY, buildConsent } from '@/lib/consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  function save(consent: ReturnType<typeof buildConsent>) {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setVisible(false);
    setPrefsOpen(false);
    window.dispatchEvent(new Event('cookie-consent-updated'));
    fetch('/api/account/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analytics: consent.analytics, marketing: consent.marketing }),
    }).catch(() => {});
    if (consent.analytics) window.location.reload();
  }

  function acceptAll() {
    save(buildConsent(true, true));
  }

  function rejectNonEssential() {
    save(buildConsent(false, false));
  }

  function savePreferences() {
    save(buildConsent(analytics, marketing));
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border bg-card p-6 shadow-drawer sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="font-semibold">We value your privacy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We use essential cookies to run Harvest Basket and optional cookies to improve your experience.{' '}
              <Link href="/privacy" className="underline">Privacy Policy</Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={acceptAll}>Accept all</Button>
            <Button variant="outline" onClick={rejectNonEssential}>Reject non-essential</Button>
            <Button variant="ghost" onClick={() => setPrefsOpen(true)}>Manage preferences</Button>
          </div>
        </div>
      </div>

      <Sheet open={prefsOpen} onOpenChange={setPrefsOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Cookie preferences</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Essential (always on)</Label>
              <p className="text-sm text-muted-foreground">Required for cart, checkout, and sign-in.</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="analytics">Analytics</Label>
              <input id="analytics" type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="marketing">Marketing</Label>
              <input id="marketing" type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            </div>
            <Button onClick={savePreferences} className="w-full">Save preferences</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
