import { NextResponse } from 'next/server';
import { searchSuggestions } from '@/lib/products/service';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`search-suggest:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [], tags: [] });
  }
  const suggestions = await searchSuggestions(q);
  return NextResponse.json(suggestions);
}
