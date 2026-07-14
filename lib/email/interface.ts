import { EmailStatus, EmailType } from '@prisma/client';

export type OrderEmailPayload = {
  id: string;
  orderNumber: string;
  userId: string;
  placedAt: Date;
  subtotalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  shippingMethodName: string;
  estimatedDeliveryMin?: Date | null;
  estimatedDeliveryMax?: Date | null;
  shippingAddress: Record<string, string>;
  user: { email: string; name?: string | null };
  items: { productName: string; variantName: string; quantity: number; lineTotal: number }[];
};

export type ShippingEmailPayload = {
  id: string;
  orderNumber: string;
  userId: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingAddress: Record<string, string>;
  user: { email: string; name?: string | null };
  items: { productName: string; variantName: string; quantity: number }[];
};

/** Pluggable email service — swap Resend adapter for another provider */
export interface EmailService {
  sendOrderConfirmation(order: OrderEmailPayload): Promise<void>;
  sendShippingUpdate(order: ShippingEmailPayload): Promise<void>;
  sendPasswordReset(email: string, resetUrl: string): Promise<void>;
}

export type EmailLogParams = {
  userId?: string;
  orderId?: string;
  type: EmailType;
  recipient: string;
  status: EmailStatus;
  providerId?: string;
  error?: string;
};
