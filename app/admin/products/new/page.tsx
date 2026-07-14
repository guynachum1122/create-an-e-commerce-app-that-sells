'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AdminProductForm, type ProductFormData } from '@/components/admin/admin-product-form';

export default function NewProductPage() {
  const router = useRouter();

  async function handleSubmit(form: ProductFormData) {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || undefined,
        description: form.description,
        ingredients: form.ingredients,
        shortDescription: form.shortDescription,
        isPublished: form.isPublished,
        isFeatured: form.isFeatured,
        categoryIds: form.categoryIds,
        tagIds: form.tagIds,
        healthInfo: form.healthInfo,
        images: form.images.filter((img) => img.url),
        variants: form.variants.map((v) => ({
          sku: v.sku,
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          stockQuantity: v.stockQuantity,
          lowStockThreshold: v.lowStockThreshold,
          attributes: v.attributes,
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || 'Failed to create product');
      return;
    }

    const data = await res.json();
    toast.success('Product created');
    router.push(`/admin/products/${data.product.id}`);
  }

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-primary hover:underline">← Back to products</Link>
      <h1 className="mt-4 text-2xl font-bold">Add product</h1>
      <div className="mt-6">
        <AdminProductForm submitLabel="Create product" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
