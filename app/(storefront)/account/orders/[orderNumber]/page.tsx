import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatPrice, isValidTrackingUrl } from '@/lib/utils';
import { noIndexMetadata } from '@/lib/seo/metadata';
import { ReorderButton } from '@/components/orders/reorder-button';

export const metadata = noIndexMetadata('Order Details');

const STATUS_STEPS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const session = await auth();
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payment: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      shippingMethod: true,
    },
  });

  if (!order || order.userId !== session?.user?.id) notFound();

  const address = order.shippingAddress as Record<string, string>;
  const currentIdx = STATUS_STEPS.indexOf(order.status === 'CANCELLED' ? 'PENDING' : order.status);
  const safeTrackingUrl = order.trackingUrl && isValidTrackingUrl(order.trackingUrl) ? order.trackingUrl : null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link href="/account/orders" className="text-sm text-primary hover:underline">← Back to orders</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-muted-foreground">Placed {new Date(order.placedAt).toLocaleDateString()}</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">{order.status}</span>
      </div>

      <div className="mt-8 flex justify-between">
        {['Placed', 'Confirmed', 'Shipped', 'Delivered'].map((label, i) => (
          <div key={label} className="flex flex-col items-center text-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${i <= currentIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {i <= currentIdx ? '✓' : i + 1}
            </div>
            <span className="mt-2 text-xs">{label}</span>
          </div>
        ))}
      </div>

      {order.trackingNumber && (
        <div className="mt-6 rounded-lg border bg-card p-4">
          <p className="font-semibold">Tracking number</p>
          <p>{order.trackingNumber}</p>
          {safeTrackingUrl && (
            <a href={safeTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Track package →
            </a>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Shipping address</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {address.firstName} {address.lastName}<br />
            {address.line1}<br />
            {address.city}, {address.state} {address.postalCode}
          </p>
          <h2 className="mt-4 font-semibold">Shipping method</h2>
          <p className="text-sm text-muted-foreground">{order.shippingMethodName}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Payment</h2>
          <p className="mt-2 text-sm">{order.payment?.status || 'N/A'}</p>
          {order.discountAmount > 0 && (
            <p className="mt-2 text-sm text-primary">Discount: −{formatPrice(order.discountAmount)}</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Items</h2>
        {order.items.map((item) => (
          <div key={item.id} className="mt-3 flex justify-between text-sm">
            <span>{item.productName} ({item.variantName}) × {item.quantity}</span>
            <span>{formatPrice(item.lineTotal)}</span>
          </div>
        ))}
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotalAmount)}</span></div>
          {order.discountAmount > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>−{formatPrice(order.discountAmount)}</span></div>}
          <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(order.shippingAmount)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(order.totalAmount)}</span></div>
        </div>
        <div className="mt-4">
          <ReorderButton items={order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, productName: i.productName }))} />
        </div>
      </div>
    </div>
  );
}
