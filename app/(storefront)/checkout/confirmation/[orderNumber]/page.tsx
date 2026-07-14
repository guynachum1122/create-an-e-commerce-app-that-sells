import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { noIndexMetadata } from '@/lib/seo/metadata';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export const metadata = noIndexMetadata('Order Confirmed');

export default async function ConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const session = await auth();
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, user: true },
  });

  if (!order || order.userId !== session?.user?.id) notFound();

  const address = order.shippingAddress as Record<string, string>;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-primary" />
      <h1 className="mt-4 font-display text-3xl font-bold">Order confirmed!</h1>
      <p className="mt-2 text-muted-foreground">
        Thank you, {address.firstName}. We&apos;ve sent a confirmation to {order.user.email}.
      </p>
      <p className="mt-4 text-lg font-semibold">Order #{order.orderNumber}</p>

      <div className="mt-8 rounded-lg border bg-card p-6 text-left">
        <h2 className="font-semibold">Items</h2>
        {order.items.map((item) => (
          <div key={item.id} className="mt-2 flex justify-between text-sm">
            <span>{item.productName} ({item.variantName}) × {item.quantity}</span>
            <span>{formatPrice(item.lineTotal)}</span>
          </div>
        ))}
        <div className="mt-4 border-t pt-4 flex justify-between font-semibold">
          <span>Total paid</span>
          <span>{formatPrice(order.totalAmount)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button asChild><Link href={`/account/orders/${order.orderNumber}`}>View order details</Link></Button>
        <Button asChild variant="outline"><Link href="/">Continue shopping</Link></Button>
      </div>
    </div>
  );
}
