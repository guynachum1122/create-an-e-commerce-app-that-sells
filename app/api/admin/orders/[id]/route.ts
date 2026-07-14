import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { sendShippingUpdate } from '@/lib/email/service';
import { adminOrderUpdateSchema, isValidStatusTransition } from '@/lib/validations';
import { isValidTrackingUrl } from '@/lib/utils';
import { OrderStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = adminOrderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid request' }, { status: 400 });
    }

    const { status, trackingNumber, trackingUrl } = parsed.data;

    if (trackingUrl && !isValidTrackingUrl(trackingUrl)) {
      return NextResponse.json({ error: 'Tracking URL must use https://' }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { user: true, items: true, payment: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!isValidStatusTransition(existing.status, status)) {
      return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${status}` }, { status: 400 });
    }

    const order = await prisma.$transaction(async (tx) => {
      if (status === OrderStatus.CANCELLED && existing.status !== OrderStatus.CANCELLED) {
        for (const item of existing.items) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: status as OrderStatus,
          trackingNumber: trackingNumber ?? existing.trackingNumber,
          trackingUrl: trackingUrl || null,
          shippedAt: status === 'SHIPPED' && existing.status !== 'SHIPPED' ? new Date() : existing.shippedAt,
          deliveredAt: status === 'DELIVERED' ? new Date() : existing.deliveredAt,
          cancelledAt: status === 'CANCELLED' ? new Date() : existing.cancelledAt,
          statusHistory: { create: { status: status as OrderStatus, note: 'Admin update' } },
        },
        include: { user: true, items: true },
      });
    });

    if (status === 'SHIPPED' && existing.status !== 'SHIPPED') {
      await sendShippingUpdate({
        ...order,
        shippingAddress: order.shippingAddress as Record<string, string>,
        user: order.user,
      });
    }

    return NextResponse.json({ order });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shippingMethod: true,
      },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
