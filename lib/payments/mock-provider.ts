import type {
  PaymentIntent,
  PaymentMethodToken,
  PaymentProvider,
  PaymentResult,
  RefundResult,
} from './types';

const pendingIntents = new Map<string, { amount: number; currency: string }>();

export class MockPaymentProvider implements PaymentProvider {
  async createPaymentIntent(
    amount: number,
    currency: string,
    _metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    await new Promise((r) => setTimeout(r, 150));
    const intentId = `mock_pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    pendingIntents.set(intentId, { amount, currency });
    return { intentId, clientSecret: `${intentId}_secret`, amount, currency };
  }

  async confirmPayment(
    intentId: string,
    paymentMethod: PaymentMethodToken,
    options?: { expectedAmount?: number }
  ): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 350));

    const intent = pendingIntents.get(intentId);
    if (!intent) {
      return { success: false, failureReason: 'Payment session expired. Please try again.' };
    }

    if (options?.expectedAmount !== undefined && intent.amount !== options.expectedAmount) {
      pendingIntents.delete(intentId);
      return { success: false, failureReason: 'Payment amount mismatch. Please refresh and try again.' };
    }

    if (paymentMethod.paymentMethodId.includes('_decline_')) {
      pendingIntents.delete(intentId);
      return { success: false, failureReason: 'Your card was declined. Please try a different card.' };
    }

    if (!paymentMethod.paymentMethodId.startsWith('mock_pm_')) {
      return { success: false, failureReason: 'Invalid payment method token.' };
    }

    pendingIntents.delete(intentId);
    const providerPaymentId = `mock_ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      providerPaymentId,
      last4: paymentMethod.last4,
    };
  }

  getIntentAmount(intentId: string): number | undefined {
    return pendingIntents.get(intentId)?.amount;
  }

  async refund(providerPaymentId: string, _amount?: number): Promise<RefundResult> {
    await new Promise((r) => setTimeout(r, 200));
    return {
      success: true,
      refundId: `mock_re_${providerPaymentId}`,
    };
  }
}

let provider: MockPaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    provider = new MockPaymentProvider();
  }
  return provider;
}

export function getMockPaymentProvider(): MockPaymentProvider {
  getPaymentProvider();
  return provider!;
}
