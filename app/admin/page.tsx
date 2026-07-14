import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { AdminDashboardClient } from '@/components/admin/dashboard-client';
import { getAbandonedCartCutoff } from '@/lib/store-settings';

async function getDashboardData(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const paidFilter = {
    placedAt: { gte: since },
    status: { not: 'CANCELLED' as const },
    payment: { status: 'SUCCEEDED' as const },
  };

  const paidOrders = await prisma.order.findMany({
    where: paidFilter,
    select: { id: true, totalAmount: true },
  });
  const paidOrderIds = paidOrders.map((o) => o.id);

  const [newCustomers, topByRevenue, topByUnits, abandonedCarts, lowStock, recentOrders] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since }, role: 'CUSTOMER' } }),
    paidOrderIds.length
      ? prisma.orderItem.groupBy({
          by: ['productId', 'productName'],
          where: { orderId: { in: paidOrderIds } },
          _sum: { lineTotal: true, quantity: true },
          orderBy: { _sum: { lineTotal: 'desc' } },
          take: 10,
        })
      : Promise.resolve([]),
    paidOrderIds.length
      ? prisma.orderItem.groupBy({
          by: ['productId', 'productName'],
          where: { orderId: { in: paidOrderIds } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        })
      : Promise.resolve([]),
    getAbandonedCartCutoff().then((cutoff) =>
      prisma.cart.count({
        where: {
          lastActivityAt: { lt: cutoff },
          items: { some: {} },
        },
      })
    ),
    prisma.$queryRaw<{ id: string; name: string; sku: string; stockQuantity: number; productName: string }[]>`
      SELECT v.id, v.name, v.sku, v."stockQuantity", p.name as "productName"
      FROM "Variant" v JOIN "Product" p ON v."productId" = p.id
      WHERE v."isActive" = true AND v."stockQuantity" <= v."lowStockThreshold"
      LIMIT 10
    `,
    prisma.order.findMany({
      orderBy: { placedAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true, name: true } } },
    }),
  ]);

  const orders = paidOrders.length;
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return {
    orders,
    totalRevenue,
    aov: orders > 0 ? Math.round(totalRevenue / orders) : 0,
    newCustomers,
    topByRevenue,
    topByUnits,
    abandonedCarts,
    lowStock,
    recentOrders,
  };
}

export default async function AdminDashboard() {
  const data = await getDashboardData(30);

  return (
    <div>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <AdminDashboardClient initialData={data} />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Recent orders</h2>
          <div className="mt-4 space-y-2">
            {data.recentOrders.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="block rounded-md p-2 hover:bg-muted">
                #{o.orderNumber} · {o.user.email} · {formatPrice(o.totalAmount)}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Low stock alerts</h2>
          <div className="mt-4 space-y-2 text-sm">
            {data.lowStock.map((v) => (
              <p key={v.id}>{v.productName} — {v.name}: {v.stockQuantity} left</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/admin/products" className="text-primary hover:underline">Manage products</Link>
        <Link href="/admin/orders" className="text-primary hover:underline">Manage orders</Link>
        <Link href="/admin/abandoned-carts" className="text-primary hover:underline">Abandoned carts</Link>
      </div>
    </div>
  );
}
