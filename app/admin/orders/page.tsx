import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { AdminOrderActions } from '@/components/admin/order-actions';
import { AdminOrdersFilters } from '@/components/admin/orders-filters';
import { OrderStatus } from '@prisma/client';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; email?: string; from?: string; to?: string }>;
}) {
  const { status, email, from, to } = await searchParams;

  const where: {
    status?: OrderStatus;
    user?: { email: { contains: string; mode: 'insensitive' } };
    placedAt?: { gte?: Date; lte?: Date };
  } = {};

  if (status && status !== 'ALL') {
    where.status = status as OrderStatus;
  }
  if (email?.trim()) {
    where.user = { email: { contains: email.trim(), mode: 'insensitive' } };
  }
  if (from || to) {
    where.placedAt = {};
    if (from) where.placedAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.placedAt.lte = end;
    }
  }

  const orders = await prisma.order.findMany({
    where,
    include: { user: { select: { email: true, name: true } } },
    orderBy: { placedAt: 'desc' },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <AdminOrdersFilters initial={{ status, email, from, to }} />

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/orders" className="text-primary hover:underline">All</Link>
        {(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className="text-primary hover:underline">{s}</Link>
        ))}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{orders.length} order(s)</p>

      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/admin/orders/${order.id}`} className="font-semibold hover:underline">#{order.orderNumber}</Link>
                <p className="text-sm text-muted-foreground">{order.user.email} · {new Date(order.placedAt).toLocaleDateString()} · {formatPrice(order.totalAmount)}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{order.status}</span>
            </div>
            <AdminOrderActions orderId={order.id} currentStatus={order.status} trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
          </div>
        ))}
      </div>
    </div>
  );
}
