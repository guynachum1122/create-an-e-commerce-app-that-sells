import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const [categories, tags] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({ categories, tags });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
