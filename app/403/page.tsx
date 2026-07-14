import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="container mx-auto flex flex-col items-center px-4 py-24 text-center">
      <h1 className="text-4xl font-bold">Access denied</h1>
      <p className="mt-4 text-muted-foreground">You don&apos;t have permission to view this page.</p>
      <Button asChild className="mt-8"><Link href="/">Back to store</Link></Button>
    </div>
  );
}
