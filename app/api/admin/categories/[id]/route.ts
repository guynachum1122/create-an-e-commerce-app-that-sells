import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { adminCategorySchema } from '@/lib/validations';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = adminCategorySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const data = { ...parsed.data };
    if (data.name && !data.slug) {
      data.slug = slugify(data.name);
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        imageUrl: data.imageUrl === '' ? null : data.imageUrl,
      },
    });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
