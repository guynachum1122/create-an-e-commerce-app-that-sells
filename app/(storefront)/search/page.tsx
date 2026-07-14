import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { searchProducts } from '@/lib/products/service';
import { ProductCard } from '@/components/product/product-card';
import { CategoryFilters } from '@/components/catalog/category-filters';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { buildSearchMetadata, buildTagMetadata } from '@/lib/seo/metadata';
import { tagLandingJsonLd } from '@/lib/seo/json-ld';
import { JsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = typeof sp.q === 'string' ? sp.q : undefined;
  const tags = typeof sp.tags === 'string' ? sp.tags : undefined;

  if (tags && !query && !tags.includes(',')) {
    const tag = await prisma.tag.findUnique({ where: { slug: tags } });
    if (tag) return buildTagMetadata(tag);
  }

  return buildSearchMetadata(query);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = typeof sp.q === 'string' ? sp.q : '';
  const tags = typeof sp.tags === 'string' ? sp.tags.split(',') : undefined;
  const singleTag = tags?.length === 1 ? tags[0] : undefined;

  const { products, total } = query || tags
    ? await searchProducts({
        query: query || undefined,
        tags,
        minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
        maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
        rating: sp.rating ? Number(sp.rating) : undefined,
        inStock: sp.inStock === 'true',
        sort: typeof sp.sort === 'string' ? sp.sort : query ? 'relevance' : undefined,
      })
    : { products: [], total: 0 };

  const [allTags, tagMeta] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    singleTag ? prisma.tag.findUnique({ where: { slug: singleTag } }) : null,
  ]);

  return (
    <>
      {tagMeta && !query && (
        <JsonLd data={tagLandingJsonLd(tagMeta, products.map((p) => ({ slug: p.slug })))} />
      )}
      <div className="container mx-auto px-4 py-8 lg:px-8">
        <h1 className="font-display text-3xl font-bold">
          {query
            ? `${total} result${total === 1 ? '' : 's'} for "${query}"`
            : tagMeta
              ? `${tagMeta.name} Foods`
              : 'Search'}
        </h1>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <CategoryFilters tags={allTags} isSearchPage={!!query} />
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <SearchX className="h-16 w-16 text-muted-foreground/50" />
                <h2 className="mt-4 text-xl font-semibold">
                  {query ? `No foods found for "${query}"` : 'Start searching'}
                </h2>
                <p className="mt-2 max-w-sm text-muted-foreground">
                  Try &ldquo;protein bar&rdquo; or browse by category.
                </p>
                <Button asChild className="mt-6"><Link href="/">Browse categories</Link></Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={{ ...p, averageRating: Number(p.averageRating) }} showWishlist />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
