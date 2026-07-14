import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { adminCategorySchema } from '@/lib/validations';

export async function GET() {
  try {
    await requireAdmin();
    const categories = await prisma.category.findMany({
      include: { parent: true, _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = adminCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { name, description, imageUrl, parentId, sortOrder, isActive } = parsed.data;
    let slug = parsed.data.slug || slugify(name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        imageUrl: imageUrl || null,
        parentId: parentId || null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
