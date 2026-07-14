'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (!agreed) {
      toast.error('Please agree to the Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || 'Unable to create account');
      return;
    }

    trackEvent(AnalyticsEvents.SIGNED_UP);
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.ok) {
      router.push('/account');
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8">
          <div className="mb-6 flex justify-center"><Leaf className="h-10 w-10 text-primary" /></div>
          <h1 className="text-center text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Save your cart across devices, track orders, and reorder in one tap.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div><Label>Email address</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
            <div><Label>Confirm password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>I agree to the <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> and Terms of Service</span>
            </label>
            <Button type="submit" className="w-full" disabled={loading}>Create account</Button>
          </form>

          <p className="mt-6 text-center text-sm">
            Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
