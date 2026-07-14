import { prisma } from '@/lib/db';
import { cartSubtotal, type getOrCreateCart } from '@/lib/cart/service';
import { getStoreSettings } from '@/lib/store-settings';
import { DiscountType } from '@prisma/client';

type Cart = Awaited<ReturnType<typeof getOrCreateCart>>;

async function validatePromo(code: string, subtotal: number) {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase().trim() },
  });
  if (!promo || !promo.isActive) return null;
  if (promo.expiresAt && promo.expiresAt < new Date()) return null;
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return null;
  if (promo.minOrderCents !== null && subtotal < promo.minOrderCents) return null;

  let discountAmount = 0;
  if (promo.discountType === DiscountType.PERCENT) {
    discountAmount = Math.round(subtotal * (promo.discountValue / 100));
  } else {
    discountAmount = Math.min(promo.discountValue, subtotal);
  }
  return { promo, discountAmount };
}

export async function calculateCheckoutTotals(params: {
  cart: Cart;
  shippingMethodId: string;
  promoCode?: string;
}) {
  const { cart, shippingMethodId, promoCode } = params;

  const [shippingMethod, settings] = await Promise.all([
    prisma.shippingMethod.findUnique({ where: { id: shippingMethodId } }),
    getStoreSettings(),
  ]);

  if (!shippingMethod?.isActive) {
    throw new Error('Invalid shipping method');
  }

  const subtotal = cartSubtotal(cart.items);
  let discountAmount = 0;
  let promoCodeId: string | undefined;

  if (promoCode) {
    const promoResult = await validatePromo(promoCode, subtotal);
    if (!promoResult) {
      throw new Error('That promo code isn\'t valid or has expired.');
    }
    discountAmount = promoResult.discountAmount;
    promoCodeId = promoResult.promo.id;
  }

  const discountedSubtotal = subtotal - discountAmount;
  const shippingAmount = discountedSubtotal >= 7500 ? 0 : shippingMethod.price;
  const taxAmount = Math.round((discountedSubtotal * (settings.taxRateBps ?? 0)) / 10000);
  const totalAmount = discountedSubtotal + shippingAmount + taxAmount;

  return {
    subtotal,
    discountAmount,
    discountedSubtotal,
    shippingAmount,
    taxAmount,
    totalAmount,
    shippingMethod,
    promoCodeId,
    taxRateBps: settings.taxRateBps ?? 0,
  };
}
