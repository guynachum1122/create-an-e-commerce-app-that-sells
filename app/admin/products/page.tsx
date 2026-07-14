import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      variants: { where: { isActive: true }, take: 1 },
      categories: { include: { category: true }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Add product</Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const v = p.variants[0];
              return (
                <tr key={p.id} className="border-b">
                  <td className="p-3"><Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link></td>
                  <td className="p-3">{v?.sku || '—'}</td>
                  <td className="p-3">{v ? formatPrice(v.price) : '—'}</td>
                  <td className="p-3">{v?.stockQuantity ?? '—'}</td>
                  <td className="p-3">{p.isPublished ? 'Published' : 'Draft'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
