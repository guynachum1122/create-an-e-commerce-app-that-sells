import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { EmailStatus, EmailType } from '@prisma/client';
import { formatPrice, escapeHtml } from '@/lib/utils';
import { isValidTrackingUrl } from '@/lib/utils';
import type { EmailService, OrderEmailPayload, ShippingEmailPayload } from './interface';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'orders@harvestbasket.com';

async function logEmail(params: {
  userId?: string;
  orderId?: string;
  type: EmailType;
  recipient: string;
  status: EmailStatus;
  providerId?: string;
  error?: string;
}) {
  await prisma.emailLog.create({ data: params });
}

class ResendEmailService implements EmailService {
  async sendOrderConfirmation(order: OrderEmailPayload) {
    const recipient = order.user.email;
    const firstName = escapeHtml(order.shippingAddress.firstName || order.user.name || 'there');

    const itemsHtml = order.items
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.productName)} (${escapeHtml(i.variantName)})</td><td>${i.quantity}</td><td>${formatPrice(i.lineTotal)}</td></tr>`
      )
      .join('');

    const html = `
      <h1>Order confirmed — #${escapeHtml(order.orderNumber)}</h1>
      <p>Hi ${firstName},</p>
      <p>Thank you for your order! We've received it and will start preparing it for shipment.</p>
      ${order.estimatedDeliveryMin && order.estimatedDeliveryMax ? `<p><strong>Estimated delivery:</strong> ${order.estimatedDeliveryMin.toLocaleDateString()} – ${order.estimatedDeliveryMax.toLocaleDateString()}</p>` : ''}
      <table border="1" cellpadding="8"><tr><th>Product</th><th>Qty</th><th>Price</th></tr>${itemsHtml}</table>
      <p><strong>Subtotal:</strong> ${formatPrice(order.subtotalAmount)}</p>
      <p><strong>Shipping (${escapeHtml(order.shippingMethodName)}):</strong> ${formatPrice(order.shippingAmount)}</p>
      <p><strong>Total:</strong> ${formatPrice(order.totalAmount)}</p>
      <p>— The Harvest Basket Team</p>
    `;

    if (!resend || process.env.NODE_ENV === 'development') {
      console.log('[Email SKIPPED]', order.orderNumber, recipient);
      await logEmail({
        userId: order.userId,
        orderId: order.id,
        type: EmailType.ORDER_CONFIRMATION,
        recipient,
        status: EmailStatus.SKIPPED,
      });
      return;
    }

    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient,
        subject: `Your Harvest Basket order is confirmed — #${order.orderNumber}`,
        html,
      });
      await logEmail({
        userId: order.userId,
        orderId: order.id,
        type: EmailType.ORDER_CONFIRMATION,
        recipient,
        status: EmailStatus.SENT,
        providerId: result.data?.id,
      });
    } catch (err) {
      await logEmail({
        userId: order.userId,
        orderId: order.id,
        type: EmailType.ORDER_CONFIRMATION,
        recipient,
        status: EmailStatus.FAILED,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  async sendShippingUpdate(order: ShippingEmailPayload) {
    const recipient = order.user.email;
    const firstName = escapeHtml(order.shippingAddress.firstName || order.user.name || 'there');
    const safeTrackingNumber = order.trackingNumber ? escapeHtml(order.trackingNumber) : '';
    const safeTrackingUrl =
      order.trackingUrl && isValidTrackingUrl(order.trackingUrl) ? escapeHtml(order.trackingUrl) : '';

    const html = `
      <h1>Your order has shipped — #${escapeHtml(order.orderNumber)}</h1>
      <p>Hi ${firstName},</p>
      <p>Good news — your order is on its way.</p>
      ${safeTrackingNumber ? `<p>Tracking: <strong>${safeTrackingNumber}</strong></p>` : ''}
      ${safeTrackingUrl ? `<p><a href="${safeTrackingUrl}">Track your package →</a></p>` : ''}
      <p>— The Harvest Basket Team</p>
    `;

    if (!resend || process.env.NODE_ENV === 'development') {
      console.log('[Email SKIPPED shipping]', order.orderNumber);
      await logEmail({
        userId: order.userId,
        orderId: order.id,
        type: EmailType.SHIPPING_UPDATE,
        recipient,
        status: EmailStatus.SKIPPED,
      });
      return;
    }

    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient,
        subject: `Your Harvest Basket order has shipped — #${order.orderNumber}`,
        html,
      });
      await logEmail({
        userId: order.userId,
        orderId: order.id,
        type: EmailType.SHIPPING_UPDATE,
        recipient,
        status: EmailStatus.SENT,
        providerId: result.data?.id,
      });
    } catch (err) {
      await logEmail({
        userId: order.userId,
        orderId: order.id,
        type: EmailType.SHIPPING_UPDATE,
        recipient,
        status: EmailStatus.FAILED,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  async sendPasswordReset(email: string, resetUrl: string) {
    const safeUrl = escapeHtml(resetUrl);
    const html = `<p>Reset your password: <a href="${safeUrl}">${safeUrl}</a></p><p>Expires in 1 hour.</p>`;

    if (!resend || process.env.NODE_ENV === 'development') {
      console.log('[Password reset]', email, resetUrl);
      await logEmail({ type: EmailType.PASSWORD_RESET, recipient: email, status: EmailStatus.SKIPPED });
      return;
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your Harvest Basket password',
      html,
    });
  }
}

const emailService: EmailService = new ResendEmailService();

export const sendOrderConfirmation = (order: OrderEmailPayload) => emailService.sendOrderConfirmation(order);
export const sendShippingUpdate = (order: ShippingEmailPayload) => emailService.sendShippingUpdate(order);
export const sendPasswordResetEmail = (email: string, resetUrl: string) => emailService.sendPasswordReset(email, resetUrl);
export { emailService };
