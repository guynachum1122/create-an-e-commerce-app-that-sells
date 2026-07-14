import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { auth } from '@/auth';
import { getOrCreateCart } from '@/lib/cart/service';
import { calculateCheckoutTotals } from '@/lib/checkout/calculate-totals';
import { getPaymentProvider } from '@/lib/payments/mock-provider';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const createIntentSchema = z.object({
  shippingMethodId: z.string().cuid(),
  promoCode: z.string().max(50).optional(),
});

export async function POST(request: Request) {
  return Sentry.startSpan({ name: 'payment.create_intent', op: 'payment' }, async () => {
    try {
      const ip = getClientIp(request);
      const rl = await rateLimitAsync(`payment-intent:${ip}`, 30, 60_000);
      if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }

      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const body = await request.json();
      const parsed = createIntentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Shipping method required' }, { status: 400 });
      }

      const cart = await getOrCreateCart();
      if (!cart.items.length) {
        return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
      }

      for (const item of cart.items) {
        if (item.quantity > item.variant.stockQuantity) {
          return NextResponse.json({
            error: `Only ${item.variant.stockQuantity} of ${item.variant.product.name} available.`,
          }, { status: 400 });
        }
      }

      const totals = await calculateCheckoutTotals({
        cart,
        shippingMethodId: parsed.data.shippingMethodId,
        promoCode: parsed.data.promoCode,
      });

      const provider = getPaymentProvider();
      const intent = await provider.createPaymentIntent(totals.totalAmount, 'USD', {
        userId: session.user.id,
      });

      return NextResponse.json(intent);
    } catch (error) {
      Sentry.captureException(error);
      const message = error instanceof Error ? error.message : 'Failed to create payment intent';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
