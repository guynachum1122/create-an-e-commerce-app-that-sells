import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/auth') && request.method === 'POST') {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(`auth-api:${ip}`, 30, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait and try again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  if (pathname.startsWith('/api/admin')) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (pathname !== pathname.toLowerCase() && !pathname.includes('.')) {
    return NextResponse.redirect(new URL(pathname.toLowerCase() + request.nextUrl.search, request.url));
  }

  if (pathname.startsWith('/admin')) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login?callbackUrl=/admin', request.url));
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }

  if (pathname.startsWith('/checkout') && !pathname.includes('/confirmation')) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login?callbackUrl=/checkout', request.url));
    }
  }

  if (pathname.startsWith('/account')) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login?callbackUrl=' + encodeURIComponent(pathname), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/checkout/:path*',
    '/account/:path*',
    '/api/auth/:path*',
    '/api/admin/:path*',
    '/((?!api|_next|favicon.ico).*)',
  ],
};
