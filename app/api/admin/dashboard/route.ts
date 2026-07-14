import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { getAbandonedCartCutoff } from '@/lib/store-settings';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get('days') || '30');
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

    const [newCustomers, topByRevenue, topByUnits, abandonedCarts] = await Promise.all([
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
            _sum: { quantity: true, lineTotal: true },
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
    ]);

    const orders = paidOrders.length;
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return NextResponse.json({
      orders,
      totalRevenue,
      aov: orders > 0 ? Math.round(totalRevenue / orders) : 0,
      newCustomers,
      abandonedCarts,
      topByRevenue,
      topByUnits,
    });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
