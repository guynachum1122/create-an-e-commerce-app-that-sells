import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { resolveProductImageUrl } from '@/lib/products/product-images';

const GUEST_CART_COOKIE = 'guest_cart_id';

export async function getGuestSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!guestId) {
    guestId = `guest_${crypto.randomUUID()}`;
    cookieStore.set(GUEST_CART_COOKIE, guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }
  return guestId;
}

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
        },
      },
    },
  },
} as const;

function withResolvedCartImages<T extends {
  items: {
    variant: {
      product: { slug: string; images: { url: string }[] };
    };
  }[];
}>(cart: T): T {
  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      variant: {
        ...item.variant,
        product: {
          ...item.variant.product,
          images: item.variant.product.images.map((img, index) => ({
            ...img,
            url: resolveProductImageUrl(item.variant.product.slug, img.url, index),
          })),
        },
      },
    })),
  };
}

export async function getOrCreateCart() {
  const session = await auth();
  const guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();

  if (session?.user?.id) {
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: cartInclude,
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: session.user.id },
        include: cartInclude,
      });
    }
    return withResolvedCartImages(cart);
  }

  let cart = await prisma.cart.findUnique({
    where: { guestSessionId },
    include: cartInclude,
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { guestSessionId },
      include: cartInclude,
    });
  }

  return withResolvedCartImages(cart);
}

export async function mergeGuestCart(userId: string, guestSessionId: string) {
  const guestCart = await prisma.cart.findUnique({
    where: { guestSessionId },
    include: { items: true },
  });
  if (!guestCart?.items.length) return;

  let userCart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!userCart) {
    userCart = await prisma.cart.create({
      data: { userId },
      include: { items: true },
    });
  }

  for (const guestItem of guestCart.items) {
    const existing = userCart.items.find((i) => i.variantId === guestItem.variantId);
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + guestItem.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          variantId: guestItem.variantId,
          quantity: guestItem.quantity,
          unitPrice: guestItem.unitPrice,
        },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
  await prisma.cart.update({
    where: { id: userCart.id },
    data: { lastActivityAt: new Date() },
  });
}

export function cartSubtotal(
  items: { quantity: number; unitPrice?: number; variant: { price: number } }[]
): number {
  return items.reduce(
    (sum, item) => sum + (item.unitPrice ?? item.variant.price) * item.quantity,
    0
  );
}

export function cartItemCount(items: { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getEffectiveUnitPrice(item: {
  unitPrice?: number;
  variant: { price: number };
}): number {
  return item.unitPrice ?? item.variant.price;
}
