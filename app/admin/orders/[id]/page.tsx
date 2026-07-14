import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { OrderActions } from '@/components/admin/order-actions';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      items: true,
      payment: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      shippingMethod: true,
    },
  });

  if (!order) notFound();

  const address = order.shippingAddress as Record<string, string>;

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-primary hover:underline">← Back to orders</Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm">{order.status}</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Customer</h2>
          <p className="mt-2 text-sm">{order.user.name} · {order.user.email}</p>
          <h2 className="mt-6 font-semibold">Shipping address</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {address.firstName} {address.lastName}<br />
            {address.line1}<br />
            {address.city}, {address.state} {address.postalCode}
          </p>
          <h2 className="mt-6 font-semibold">Payment</h2>
          <p className="mt-2 text-sm">{order.payment?.status || 'N/A'} · {order.payment?.provider}</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Line items</h2>
          <div className="mt-4 space-y-2 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between border-b py-2">
                <span>{item.productName} ({item.variantName}) × {item.quantity}</span>
                <span>{formatPrice(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotalAmount)}</span></div>
            {order.discountAmount > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>−{formatPrice(order.discountAmount)}</span></div>}
            <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(order.shippingAmount)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(order.totalAmount)}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <OrderActions orderId={order.id} currentStatus={order.status} trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
      </div>
    </div>
  );
}
