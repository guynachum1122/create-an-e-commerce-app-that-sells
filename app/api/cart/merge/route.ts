import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mergeGuestCart, getGuestSessionId } from '@/lib/cart/service';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const guestSessionId = await getGuestSessionId();
  await mergeGuestCart(session.user.id, guestSessionId);

  return NextResponse.json({ ok: true });
}
