import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { noIndexMetadata } from '@/lib/seo/metadata';

export const metadata = noIndexMetadata('Reset Password');

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Password reset via email is configured with Resend. In development, reset links are logged to the console.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/login" className="text-primary hover:underline">← Back to sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
