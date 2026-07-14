import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getOrCreateCart, cartSubtotal, cartItemCount } from '@/lib/cart/service';
import { prisma } from '@/lib/db';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { cartAddSchema, cartUpdateSchema, cartRemoveSchema } from '@/lib/validations';

export async function GET() {
  try {
    const cart = await getOrCreateCart();
    const outOfStock = cart.items.filter((item) => item.quantity > item.variant.stockQuantity);
    return NextResponse.json({
      id: cart.id,
      items: cart.items,
      subtotal: cartSubtotal(cart.items),
      itemCount: cartItemCount(cart.items),
      outOfStock: outOfStock.map((item) => ({
        productName: item.variant.product.name,
        variantName: item.variant.name,
        available: item.variant.stockQuantity,
        requested: item.quantity,
      })),
      hasOutOfStock: outOfStock.length > 0,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to load cart' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(`cart:${ip}`, 60, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = cartAddSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid request' }, { status: 400 });
    }

    const { variantId, quantity } = parsed.data;

    const variant = await prisma.variant.findUnique({ where: { id: variantId }, include: { product: true } });
    if (!variant || !variant.isActive || variant.stockQuantity < quantity) {
      return NextResponse.json({ error: 'Item out of stock or unavailable' }, { status: 400 });
    }

    const cart = await getOrCreateCart();
    const unitPrice = variant.price;

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > variant.stockQuantity) {
        return NextResponse.json({ error: `Only ${variant.stockQuantity} available in stock.` }, { status: 400 });
      }
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, unitPrice },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, variantId, quantity, unitPrice },
      });
    }

    await prisma.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } });

    const updated = await getOrCreateCart();
    return NextResponse.json({
      items: updated.items,
      subtotal: cartSubtotal(updated.items),
      itemCount: cartItemCount(updated.items),
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(`cart:${ip}`, 60, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = cartUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { itemId, quantity } = parsed.data;
    const cart = await getOrCreateCart();
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { variant: true },
    });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (quantity > item.variant.stockQuantity) {
      return NextResponse.json({ error: `Only ${item.variant.stockQuantity} available.` }, { status: 400 });
    }
    if (quantity < 1) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }
    await prisma.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(`cart:${ip}`, 60, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = cartRemoveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const cart = await getOrCreateCart();
    await prisma.cartItem.deleteMany({ where: { id: parsed.data.itemId, cartId: cart.id } });
    await prisma.cart.update({ where: { id: cart.id }, data: { lastActivityAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
