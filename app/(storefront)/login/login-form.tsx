'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { safeCallbackUrl } from '@/lib/utils';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'), '/account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      const message = result.error.includes('Too many')
        ? result.error
        : 'Email or password is incorrect. Please try again.';
      toast.error(message);
      return;
    }

    trackEvent(AnalyticsEvents.LOGGED_IN);
    await fetch('/api/cart/merge', { method: 'POST' });
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8">
          <div className="mb-6 flex justify-center">
            <Leaf className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-center text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Sign in to track orders, save addresses, and reorder in seconds.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>Sign in</Button>
          </form>

          <div className="my-6 text-center text-sm text-muted-foreground">or</div>
          <Button variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl })}>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm">
            New here? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
