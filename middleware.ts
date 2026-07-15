import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';

type AuthToken = {
  sub?: string;
  id?: string;
  role?: 'ADMIN' | 'CUSTOMER';
};

async function getAuthToken(request: NextRequest): Promise<AuthToken | null> {
  return (await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  })) as AuthToken | null;
}

function isAuthenticated(token: AuthToken | null): boolean {
  return Boolean(token?.sub || token?.id);
}

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

  const needsAuth =
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/admin') ||
    (pathname.startsWith('/checkout') && !pathname.includes('/confirmation')) ||
    pathname.startsWith('/account');

  const token = needsAuth ? await getAuthToken(request) : null;

  if (pathname.startsWith('/api/admin')) {
    if (!isAuthenticated(token) || token?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (pathname !== pathname.toLowerCase() && !pathname.includes('.')) {
    return NextResponse.redirect(new URL(pathname.toLowerCase() + request.nextUrl.search, request.url));
  }

  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated(token)) {
      return NextResponse.redirect(new URL('/login?callbackUrl=/admin', request.url));
    }
    if (token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }

  if (pathname.startsWith('/checkout') && !pathname.includes('/confirmation')) {
    if (!isAuthenticated(token)) {
      return NextResponse.redirect(new URL('/login?callbackUrl=/checkout', request.url));
    }
  }

  if (pathname.startsWith('/account')) {
    if (!isAuthenticated(token)) {
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
