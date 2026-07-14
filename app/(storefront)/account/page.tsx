import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { noIndexMetadata } from '@/lib/seo/metadata';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = noIndexMetadata('My Account');

export default async function AccountPage() {
  const session = await auth();
  const [orderCount, wishlistCount, defaultAddress] = await Promise.all([
    prisma.order.count({ where: { userId: session!.user.id } }),
    prisma.wishlistItem.count({ where: { userId: session!.user.id } }),
    prisma.address.findFirst({ where: { userId: session!.user.id, isDefault: true } }),
  ]);

  const lastOrder = await prisma.order.findFirst({
    where: { userId: session!.user.id },
    orderBy: { placedAt: 'desc' },
  });

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Hello, {session?.user.name?.split(' ')[0] || 'there'}</h1>
      <p className="mt-2 text-muted-foreground">Manage your orders, addresses, and saved foods.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Your latest order</h2>
            {lastOrder ? (
              <p className="mt-2 text-sm text-muted-foreground">#{lastOrder.orderNumber} · {lastOrder.status}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No orders yet</p>
            )}
            <Button asChild variant="link" className="mt-2 px-0"><Link href="/account/orders">View orders ({orderCount})</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Wishlist</h2>
            <p className="mt-2 text-sm text-muted-foreground">{wishlistCount} items saved</p>
            <Button asChild variant="link" className="mt-2 px-0"><Link href="/account/wishlist">View wishlist</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Default address</h2>
            {defaultAddress ? (
              <p className="mt-2 text-sm text-muted-foreground">{defaultAddress.line1}, {defaultAddress.city}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No saved address</p>
            )}
            <Button asChild variant="link" className="mt-2 px-0"><Link href="/account/addresses">Manage addresses</Link></Button>
          </CardContent>
        </Card>
      </div>

      <nav className="mt-8 flex flex-wrap gap-4 border-t pt-8">
        {[
          { href: '/account/profile', label: 'Profile' },
          { href: '/account/addresses', label: 'Addresses' },
          { href: '/account/orders', label: 'Orders' },
          { href: '/account/wishlist', label: 'Wishlist' },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="text-primary hover:underline">{link.label}</Link>
        ))}
      </nav>
    </div>
  );
}
