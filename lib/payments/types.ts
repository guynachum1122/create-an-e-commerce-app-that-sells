/** Client-side card input — never sent to server (PCI compliance) */
export interface PaymentMethodInput {
  cardNumber: string;
  expiry: string;
  cvc: string;
  nameOnCard: string;
}

/** Token returned by payment provider — safe to send to server */
export interface PaymentMethodToken {
  paymentMethodId: string;
  last4: string;
}

export interface PaymentIntent {
  intentId: string;
  clientSecret?: string;
  amount: number;
  currency: string;
}

export interface PaymentResult {
  success: boolean;
  providerPaymentId?: string;
  failureReason?: string;
  last4?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  failureReason?: string;
}

/** Stripe-ready interface — swap MOCK for STRIPE without changing checkout flow */
export interface PaymentProvider {
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntent>;
  confirmPayment(
    intentId: string,
    paymentMethod: PaymentMethodToken,
    options?: { expectedAmount?: number }
  ): Promise<PaymentResult>;
  refund(providerPaymentId: string, amount?: number): Promise<RefundResult>;
}

/** Test card ending in 0002 always declines */
export const DECLINE_CARD_SUFFIX = '0002';

export function getLast4(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  return digits.slice(-4);
}

export function maskCardNumber(last4: string): string {
  return `•••• ${last4}`;
}
