import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStoreSettings } from '@/lib/store-settings';

export async function GET() {
  const [methods, settings] = await Promise.all([
    prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    getStoreSettings(),
  ]);
  return NextResponse.json({ methods, taxRateBps: settings.taxRateBps ?? 0 });
}
