import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { JsonLd } from '@/components/seo/JsonLd';
import { homepageJsonLd } from '@/lib/seo/json-ld';
import { ShieldCheck, Truck, RotateCcw } from 'lucide-react';

export const revalidate = 3600;

export default async function HomePage() {
  const [categories, featuredProducts, tags] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      take: 8,
    }),
    prisma.product.findMany({
      where: { isPublished: true, isFeatured: true },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
        tags: { include: { tag: true } },
      },
      take: 4,
    }),
    prisma.tag.findMany({ take: 10 }),
  ]);

  return (
    <>
      <JsonLd data={homepageJsonLd(featuredProducts)} />

      <section className="bg-gradient-to-br from-brand-50 to-earth-50 dark:from-brand-900/20 dark:to-background">
        <div className="container mx-auto grid min-h-[480px] items-center gap-8 px-4 py-16 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Fresh food, honest nutrition</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight lg:text-5xl">
              Fresh food, delivered with nothing to hide
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Shop by category, filter by diet, and see full nutrition facts on every product — before you add to cart.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg"><Link href="#categories">Browse categories</Link></Button>
              <Button asChild variant="outline" size="lg"><Link href="/category/deals">Shop best deals</Link></Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Secure checkout · Free shipping over $50 · Easy returns within 14 days
            </p>
          </div>
          <div className="hidden aspect-square rounded-2xl bg-brand-100 lg:block dark:bg-brand-900/30" />
        </div>
      </section>

      <section id="categories" className="container mx-auto px-4 py-12 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shop by category</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">Find what fits your fridge — and your goals</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/category/${cat.slug}`} className="rounded-xl border bg-card p-6 text-center shadow-card transition-shadow hover:shadow-card-hover">
              <h3 className="font-semibold">{cat.name}</h3>
              {cat.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{cat.description}</p>}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-secondary/30 py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff picks</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">Featured this week</h2>
            </div>
            <Link href="/search" className="text-sm font-medium text-primary hover:underline">View all products →</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shop by diet</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">Filter foods that match how you eat</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link key={tag.id} href={`/search?tags=${tag.slug}`} className="rounded-full bg-brand-100 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-200 dark:bg-brand-900 dark:text-brand-100">
              {tag.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t bg-card py-8">
        <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3 lg:px-8">
          <div className="flex gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Secure checkout</p>
              <p className="text-sm text-muted-foreground">Card details handled by our payment provider; we never store your full card number.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Truck className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Fast delivery</p>
              <p className="text-sm text-muted-foreground">Most orders ship within 1–2 business days.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <RotateCcw className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Easy returns</p>
              <p className="text-sm text-muted-foreground">Return unopened items within 14 days.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
