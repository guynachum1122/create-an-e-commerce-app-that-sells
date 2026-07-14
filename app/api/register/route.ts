import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { registerSchema } from '@/lib/validations';

export async function POST(request: Request) {
  return Sentry.startSpan({ name: 'auth.register', op: 'auth' }, async () => {
    try {
      const ip = getClientIp(request);
      const rl = await rateLimitAsync(`register:${ip}`, 10, 15 * 60_000);
      if (!rl.success) {
        return NextResponse.json({ error: 'Too many attempts. Please wait a moment and try again.' }, { status: 429 });
      }

      const body = await request.json();
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 });
      }

      const { name, email, password } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists. Sign in instead.' }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: { email: normalizedEmail, name, passwordHash },
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      Sentry.captureException(error);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
  });
}
