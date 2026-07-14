import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { accountDeleteSchema } from '@/lib/validations';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`account-delete:${ip}`, 3, 15 * 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many deletion attempts. Wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = await request.json();
  const parsed = accountDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Confirmation required' }, { status: 400 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (user.passwordHash) {
    if (!parsed.data.password) {
      return NextResponse.json({ error: 'Enter your current password to confirm deletion.' }, { status: 400 });
    }
    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Password is incorrect.' }, { status: 403 });
    }
  }

  const placeholderEmail = `deleted_${userId}@anonymous.local`;
  const redactedAddress = { redacted: true, note: 'Address removed per GDPR request' };

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.wishlistItem.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });
    await tx.cartItem.deleteMany({ where: { cart: { userId } } });
    await tx.cart.deleteMany({ where: { userId } });

    await tx.review.updateMany({
      where: { userId },
      data: { body: '[deleted]', title: null },
    });

    await tx.order.updateMany({
      where: { userId },
      data: {
        shippingAddress: redactedAddress,
        billingAddress: Prisma.DbNull,
        notes: null,
      },
    });

    await tx.emailLog.updateMany({
      where: { userId },
      data: { recipient: placeholderEmail },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: new Date(),
        deletedAt: new Date(),
        anonymizedAt: new Date(),
        email: placeholderEmail,
        name: 'Deleted User',
        passwordHash: null,
        image: null,
        analyticsConsent: false,
        marketingConsent: false,
      },
    });

    await tx.complianceLog.create({
      data: {
        action: 'ACCOUNT_DELETED',
        userId,
        metadata: {
          originalEmailHash: user.email,
          requestedAt: new Date().toISOString(),
        },
      },
    });
  });

  return NextResponse.json({ ok: true, signOut: true });
}
