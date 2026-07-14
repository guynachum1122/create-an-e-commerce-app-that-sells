import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { noIndexMetadata } from '@/lib/seo/metadata';
import { Button } from '@/components/ui/button';

export const metadata = noIndexMetadata('Orders');

export default async function OrdersPage() {
  const session = await auth();
  const orders = await prisma.order.findMany({
    where: { userId: session!.user.id },
    orderBy: { placedAt: 'desc' },
    include: { items: true },
  });

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">No orders yet</h1>
        <p className="mt-2 text-muted-foreground">When you place your first order, it will appear here.</p>
        <Button asChild className="mt-6"><Link href="/">Start shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Orders</h1>
      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
            <div>
              <p className="font-semibold">#{order.orderNumber}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(order.placedAt).toLocaleDateString()} · {order.status} · {formatPrice(order.totalAmount)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm"><Link href={`/account/orders/${order.orderNumber}`}>View details</Link></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
