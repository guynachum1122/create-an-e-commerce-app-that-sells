import { notFound } from 'next/navigation';
import Link from 'next/link';
import { escapeHtml } from '@/lib/utils';
import { getProductBySlug, getRecommendations } from '@/lib/products/service';
import { buildProductMetadata } from '@/lib/seo/metadata';
import { productJsonLd } from '@/lib/seo/json-ld';
import { JsonLd } from '@/components/seo/JsonLd';
import { ProductCard } from '@/components/product/product-card';
import { ProductDetailClient } from '@/components/product/product-detail-client';
import { NutritionFactsCard } from '@/components/product/nutrition-facts-card';
import { ReviewsSection } from '@/components/product/reviews-section';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return buildProductMetadata({
    ...product,
    averageRating: Number(product.averageRating),
    tags: product.tags.map((t) => t.tag),
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const recommendations = await getRecommendations(product.id);
  const category = product.categories[0]?.category;

  return (
    <>
      <JsonLd
        data={productJsonLd({
          ...product,
          averageRating: Number(product.averageRating),
          categoryName: category?.name,
          categorySlug: category?.slug,
          tags: product.tags.map((t) => t.tag),
          reviews: product.reviews,
        })}
      />

      <div className="container mx-auto px-4 py-8 lg:px-8">
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          {category && (
            <>
              {' / '}
              <Link href={`/category/${category.slug}`} className="hover:text-foreground">{category.name}</Link>
            </>
          )}
          {' / '}
          <span className="text-foreground">{product.name}</span>
        </nav>

        <ProductDetailClient
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            shortDescription: product.shortDescription,
            defaultVariantId: product.defaultVariantId,
            averageRating: Number(product.averageRating),
            reviewCount: product.reviewCount,
            variants: product.variants.map((v) => ({
              ...v,
              attributes: (v.attributes as Record<string, unknown>) || {},
            })),
          }}
          images={product.images}
          tags={product.tags.map((t) => t.tag)}
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="mt-4 whitespace-pre-wrap">{escapeHtml(product.description)}</p>
            <h2 className="mt-8 text-xl font-semibold">Ingredients</h2>
            <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{escapeHtml(product.ingredients)}</p>
          </div>
          {product.healthInfo && <NutritionFactsCard healthInfo={product.healthInfo} ingredients={product.ingredients} />}
        </div>

        <ReviewsSection productId={product.id} reviews={product.reviews} reviewCount={product.reviewCount} averageRating={Number(product.averageRating)} />

        {recommendations.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold">Customers who bought this also bought</h2>
            <p className="mt-1 text-muted-foreground">Frequently paired by shoppers with similar diets and carts.</p>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {recommendations.map((p) => (
                <ProductCard key={p.id} product={{ ...p, averageRating: Number(p.averageRating) }} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
