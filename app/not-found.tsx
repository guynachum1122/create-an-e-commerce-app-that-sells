import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="container mx-auto flex flex-col items-center px-4 py-24 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="mt-4 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <Button asChild className="mt-8"><Link href="/">Go to homepage</Link></Button>
    </div>
  );
}
