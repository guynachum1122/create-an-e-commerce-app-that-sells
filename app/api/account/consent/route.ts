import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const consentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json();
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid consent' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      analyticsConsent: parsed.data.analytics,
      marketingConsent: parsed.data.marketing ?? false,
    },
  });

  return NextResponse.json({ ok: true });
}
