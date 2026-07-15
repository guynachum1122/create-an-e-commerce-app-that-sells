import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import type { UserRole } from '@prisma/client';

const PLACEHOLDER_SECRET = 'change-me-in-production-use-openssl-rand-base64-32';
const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';

if (
  process.env.NODE_ENV === 'production' &&
  !isProductionBuild &&
  (!process.env.AUTH_SECRET || process.env.AUTH_SECRET === PLACEHOLDER_SECRET)
) {
  throw new Error('AUTH_SECRET must be set to a secure random value in production');
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
  interface User {
    role: UserRole;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    roleCheckedAt?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();

        const emailRl = rateLimit(`login:email:${email}`, 5, 15 * 60_000);
        if (!emailRl.success) {
          throw new Error('Too many login attempts. Wait a minute and try again.');
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash || user.deletedAt) {
          return null;
        }

        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.roleCheckedAt = Date.now();
      }

      const shouldRefreshRole =
        token.id &&
        (trigger === 'update' ||
          !token.roleCheckedAt ||
          Date.now() - (token.roleCheckedAt as number) > 300_000);

      if (shouldRefreshRole) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, deletedAt: true },
        });
        if (dbUser && !dbUser.deletedAt) {
          token.role = dbUser.role;
        }
        token.roleCheckedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.id) {
        // Flag for client-side cart merge after OAuth redirect
        // Client CartMergeOnLogin component handles the merge call
      }
    },
  },
});

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'ADMIN') throw new Error('Forbidden');
  return session;
}
