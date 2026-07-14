'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AdminProductForm, type ProductFormData } from '@/components/admin/admin-product-form';
import { toast } from 'sonner';

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [initial, setInitial] = useState<Partial<ProductFormData> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.product;
        if (!p) return;
        setInitial({
          name: p.name,
          slug: p.slug,
          description: p.description,
          ingredients: p.ingredients,
          shortDescription: p.shortDescription || '',
          isPublished: p.isPublished,
          isFeatured: p.isFeatured ?? false,
          categoryIds: p.categories?.map((c: { categoryId: string }) => c.categoryId) || [],
          tagIds: p.tags?.map((t: { tagId: string }) => t.tagId) || [],
          healthInfo: p.healthInfo ? {
            servingSize: p.healthInfo.servingSize,
            calories: p.healthInfo.calories,
            proteinGrams: Number(p.healthInfo.proteinGrams),
            carbohydratesGrams: Number(p.healthInfo.carbohydratesGrams),
            fatGrams: Number(p.healthInfo.fatGrams),
            fiberGrams: p.healthInfo.fiberGrams ? Number(p.healthInfo.fiberGrams) : 0,
            sugarGrams: p.healthInfo.sugarGrams ? Number(p.healthInfo.sugarGrams) : 0,
            sodiumMg: p.healthInfo.sodiumMg ?? 0,
            allergens: p.healthInfo.allergens || [],
            additionalNotes: p.healthInfo.additionalNotes || '',
          } : undefined,
          images: p.images?.map((img: { url: string; altText?: string; sortOrder: number; isPrimary: boolean }, i: number) => ({
            url: img.url,
            altText: img.altText || p.name,
            sortOrder: img.sortOrder ?? i,
            isPrimary: img.isPrimary ?? i === 0,
          })) || [],
          variants: p.variants?.map((v: {
            id: string;
            sku: string;
            name: string;
            price: number;
            compareAtPrice?: number | null;
            stockQuantity: number;
            lowStockThreshold: number;
            attributes: Record<string, string>;
            isActive: boolean;
          }) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stockQuantity: v.stockQuantity,
            lowStockThreshold: v.lowStockThreshold,
            attributes: (v.attributes as Record<string, string>) || {},
            isActive: v.isActive,
          })) || [],
        });
        setLoading(false);
      });
  }, [id]);

  async function handleSubmit(form: ProductFormData) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        description: form.description,
        ingredients: form.ingredients,
        shortDescription: form.shortDescription,
        isPublished: form.isPublished,
        isFeatured: form.isFeatured,
        categoryIds: form.categoryIds,
        tagIds: form.tagIds,
        healthInfo: form.healthInfo,
        images: form.images.filter((img) => img.url),
        variants: form.variants,
      }),
    });

    if (res.ok) toast.success('Product saved');
    else {
      const data = await res.json();
      toast.error(data.error || 'Save failed');
    }
  }

  async function deleteProduct() {
    if (!confirm('Unpublish this product?')) return;
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    toast.success('Product unpublished');
    window.location.href = '/admin/products';
  }

  if (loading || !initial) return <div className="p-8">Loading…</div>;

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-primary hover:underline">← Back to products</Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit: {initial.name}</h1>
        <Button variant="destructive" onClick={deleteProduct}>Unpublish</Button>
      </div>
      <div className="mt-6">
        <AdminProductForm initial={initial} submitLabel="Save changes" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
