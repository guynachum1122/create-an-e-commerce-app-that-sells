import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`login:${ip}`, 5, 15 * 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many login attempts' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }
  return NextResponse.json({ ok: true });
}
