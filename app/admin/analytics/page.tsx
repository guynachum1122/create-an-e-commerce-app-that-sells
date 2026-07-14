import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';

export default async function AdminAnalyticsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const paidFilter = {
    placedAt: { gte: thirtyDaysAgo },
    status: { not: 'CANCELLED' as const },
    payment: { status: 'SUCCEEDED' as const },
  };

  const paidOrders = await prisma.order.findMany({
    where: paidFilter,
    select: { id: true, totalAmount: true },
  });
  const paidOrderIds = paidOrders.map((o) => o.id);

  const [orderCount, topProducts] = await Promise.all([
    Promise.resolve(paidOrders.length),
    paidOrderIds.length
      ? prisma.orderItem.groupBy({
          by: ['productId', 'productName'],
          where: { orderId: { in: paidOrderIds } },
          _sum: { lineTotal: true, quantity: true },
          orderBy: { _sum: { lineTotal: 'desc' } },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const aov = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="text-sm text-muted-foreground">Last 30 days — paid orders only</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-6"><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p></div>
        <div className="rounded-lg border bg-card p-6"><p className="text-sm text-muted-foreground">Orders</p><p className="text-2xl font-bold">{orderCount}</p></div>
        <div className="rounded-lg border bg-card p-6"><p className="text-sm text-muted-foreground">AOV</p><p className="text-2xl font-bold">{formatPrice(aov)}</p></div>
      </div>
      <div className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Top products by revenue</h2>
        <div className="mt-4 space-y-2">
          {topProducts.map((p, i) => (
            <div key={p.productId} className="flex justify-between text-sm">
              <span>{i + 1}. {p.productName}</span>
              <span>{formatPrice(p._sum.lineTotal || 0)} ({p._sum.quantity} units)</span>
            </div>
          ))}
          {!topProducts.length && (
            <p className="text-sm text-muted-foreground">No paid orders in this period</p>
          )}
        </div>
      </div>
    </div>
  );
}
