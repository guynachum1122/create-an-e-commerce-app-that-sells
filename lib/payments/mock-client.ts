'use client';

import type { PaymentMethodInput } from './types';
import { getLast4 } from './types';

/**
 * Client-side mock tokenization — simulates Stripe Elements.
 * Raw card data never leaves the browser; only paymentMethodId is sent to the server.
 */
export async function tokenizeMockPaymentMethod(
  input: PaymentMethodInput
): Promise<{ paymentMethodId: string; last4: string }> {
  await new Promise((r) => setTimeout(r, 300));

  const digits = input.cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) {
    throw new Error('Enter a valid card number.');
  }

  const last4 = getLast4(digits);
  const status = digits.endsWith('0002') ? 'decline' : 'success';
  const paymentMethodId = `mock_pm_${status}_${last4}_${Date.now()}`;

  return { paymentMethodId, last4 };
}
