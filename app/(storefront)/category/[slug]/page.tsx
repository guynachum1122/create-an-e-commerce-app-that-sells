import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { searchProducts, getCategoryAttributeOptions } from '@/lib/products/service';
import { buildCategoryMetadata } from '@/lib/seo/metadata';
import { ProductCard } from '@/components/product/product-card';
import { CategoryFilters } from '@/components/catalog/category-filters';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category || !category.isActive) return {};
  return buildCategoryMetadata(category);
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await prisma.category.findUnique({ where: { slug, isActive: true } });
  if (!category) notFound();

  const tags = typeof sp.tags === 'string' ? sp.tags.split(',') : undefined;

  const attributes: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(sp)) {
    if (typeof key === 'string' && key.startsWith('attr_') && typeof value === 'string') {
      const attrKey = key.replace('attr_', '');
      attributes[attrKey] = value.split(',').filter(Boolean);
    }
  }

  const { products, total } = await searchProducts({
    categorySlug: slug,
    tags,
    attributes: Object.keys(attributes).length ? attributes : undefined,
    minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
    rating: sp.rating ? Number(sp.rating) : undefined,
    inStock: sp.inStock === 'true',
    sort: typeof sp.sort === 'string' ? sp.sort : undefined,
    page: sp.page ? Number(sp.page) : 1,
  });

  const allTags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  const attributeOptions = await getCategoryAttributeOptions(slug);

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/">Home</Link> / <span>{category.name}</span>
      </nav>
      <h1 className="font-display text-3xl font-bold">{category.name}</h1>
      {category.description && <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>}

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <CategoryFilters tags={allTags} attributeOptions={attributeOptions} />
        <div className="flex-1">
          <p className="mb-4 text-sm text-muted-foreground">{total} products</p>
          {products.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-xl font-semibold">No products match your filters</h2>
              <p className="mt-2 text-muted-foreground">Try removing a filter or adjusting your price range.</p>
              <Link href={`/category/${slug}`} className="mt-4 inline-block text-primary hover:underline">Clear all filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={{ ...p, averageRating: Number(p.averageRating) }} showQuickAdd showWishlist />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
