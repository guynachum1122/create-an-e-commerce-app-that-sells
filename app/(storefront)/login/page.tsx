import { Suspense } from 'react';
import { noIndexMetadata } from '@/lib/seo/metadata';
import LoginForm from './login-form';

export const metadata = noIndexMetadata('Sign In');

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
