import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getOrCreateCart } from '@/lib/cart/service';
import { calculateCheckoutTotals } from '@/lib/checkout/calculate-totals';
import { getPaymentProvider, getMockPaymentProvider } from '@/lib/payments/mock-provider';
import { generateOrderNumber } from '@/lib/utils';
import { sendOrderConfirmation } from '@/lib/email/service';
import { captureServerEvent } from '@/lib/posthog-server';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { checkoutSchema } from '@/lib/validations';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export async function POST(request: Request) {
  return Sentry.startSpan({ name: 'checkout.place_order', op: 'checkout' }, async () => {
    try {
      const ip = getClientIp(request);
      const rl = await rateLimitAsync(`checkout:${ip}`, 20, 60_000);
      if (!rl.success) {
        return NextResponse.json(
          { error: 'Too many attempts. Please wait a moment and try again.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
        );
      }

      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const body = await request.json();
      const parsed = checkoutSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid request' }, { status: 400 });
      }

      const { addressId, newAddress, shippingMethodId, intentId, paymentMethodId, last4, promoCode } = parsed.data;

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

      let addressSnapshot: Record<string, string>;
      if (addressId) {
        const addr = await prisma.address.findFirst({ where: { id: addressId, userId: session.user.id } });
        if (!addr) return NextResponse.json({ error: 'Address not found' }, { status: 400 });
        addressSnapshot = {
          firstName: addr.firstName, lastName: addr.lastName, line1: addr.line1,
          line2: addr.line2 || '', city: addr.city, state: addr.state || '',
          postalCode: addr.postalCode, country: addr.country, phone: addr.phone || '',
        };
      } else if (newAddress) {
        addressSnapshot = {
          firstName: newAddress.firstName,
          lastName: newAddress.lastName,
          line1: newAddress.line1,
          line2: newAddress.line2 || '',
          city: newAddress.city,
          state: newAddress.state || '',
          postalCode: newAddress.postalCode,
          country: newAddress.country,
          phone: newAddress.phone || '',
        };
        await prisma.address.create({
          data: {
            userId: session.user.id,
            label: newAddress.label,
            firstName: newAddress.firstName,
            lastName: newAddress.lastName,
            line1: newAddress.line1,
            line2: newAddress.line2,
            city: newAddress.city,
            state: newAddress.state,
            postalCode: newAddress.postalCode,
            country: newAddress.country,
            phone: newAddress.phone,
            isDefault: newAddress.isDefault ?? false,
          },
        });
      } else {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
      }

      const totals = await calculateCheckoutTotals({ cart, shippingMethodId, promoCode });
      const { subtotal, discountAmount, shippingAmount, taxAmount, totalAmount, shippingMethod, promoCodeId } = totals;

      const mockProvider = getMockPaymentProvider();
      const intentAmount = mockProvider.getIntentAmount(intentId);
      if (intentAmount === undefined) {
        return NextResponse.json({ error: 'Payment session expired. Please try again.' }, { status: 400 });
      }
      if (intentAmount !== totalAmount) {
        return NextResponse.json({ error: 'Order total changed. Please refresh checkout and try again.' }, { status: 409 });
      }

      const paymentProvider = getPaymentProvider();
      const paymentResult = await Sentry.startSpan({ name: 'payment.confirm', op: 'payment' }, () =>
        paymentProvider.confirmPayment(intentId, { paymentMethodId, last4: last4 || '0000' }, {
          expectedAmount: totalAmount,
        })
      );

      if (!paymentResult.success) {
        return NextResponse.json({ error: paymentResult.failureReason || 'Payment declined' }, { status: 402 });
      }

      const now = new Date();
      const deliveryMin = new Date(now);
      deliveryMin.setDate(deliveryMin.getDate() + shippingMethod.estimatedDaysMin);
      const deliveryMax = new Date(now);
      deliveryMax.setDate(deliveryMax.getDate() + shippingMethod.estimatedDaysMax);

      const order = await prisma.$transaction(async (tx) => {
        for (const item of cart.items) {
          const updated = await tx.variant.updateMany({
            where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            throw new Error(`Insufficient stock for ${item.variant.product.name}`);
          }
        }

        if (promoCodeId) {
          await tx.promoCode.update({
            where: { id: promoCodeId },
            data: { usedCount: { increment: 1 } },
          });
        }

        const created = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId: session.user.id,
            status: OrderStatus.PROCESSING,
            subtotalAmount: subtotal,
            discountAmount,
            shippingAmount,
            taxAmount,
            totalAmount,
            promoCodeId,
            shippingMethodId: shippingMethod.id,
            shippingMethodName: shippingMethod.name,
            estimatedDeliveryMin: deliveryMin,
            estimatedDeliveryMax: deliveryMax,
            shippingAddress: addressSnapshot,
            items: {
              create: cart.items.map((item) => {
                const unitPrice = item.unitPrice ?? item.variant.price;
                return {
                  variantId: item.variantId,
                  productId: item.variant.productId,
                  productName: item.variant.product.name,
                  variantName: item.variant.name,
                  sku: item.variant.sku,
                  quantity: item.quantity,
                  unitPrice,
                  compareAtUnitPrice: item.variant.compareAtPrice,
                  lineTotal: unitPrice * item.quantity,
                };
              }),
            },
            statusHistory: { create: { status: OrderStatus.PROCESSING, note: 'Order placed' } },
            payment: {
              create: {
                provider: 'MOCK',
                providerPaymentId: paymentResult.providerPaymentId!,
                amount: totalAmount,
                status: PaymentStatus.SUCCEEDED,
                metadata: { last4: paymentResult.last4 },
              },
            },
          },
          include: { items: true, user: true },
        });

        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.variant.productId },
            data: { orderCount: { increment: item.quantity } },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } });

        return created;
      });

      await sendOrderConfirmation({
        ...order,
        shippingAddress: addressSnapshot,
        user: order.user,
      });

      await captureServerEvent(session.user.id, 'purchase_completed', {
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
      });

      return NextResponse.json({
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
      });
    } catch (error) {
      Sentry.captureException(error);
      const message = error instanceof Error ? error.message : 'Order placement failed';
      if (message.includes('Insufficient stock')) {
        return NextResponse.json({ error: 'Some items in your cart are no longer available.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'We couldn\'t place your order. You were not charged.' }, { status: 500 });
    }
  });
}
