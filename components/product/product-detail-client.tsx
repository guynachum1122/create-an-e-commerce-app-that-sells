'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductGallery } from '@/components/product/product-gallery';
import { AddToCartSection } from '@/components/product/add-to-cart-section';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, RotateCcw, Truck } from 'lucide-react';
import { formatPrice, getDiscountPercent } from '@/lib/utils';

type ProductImage = { id: string; url: string; altText?: string | null };

type Variant = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  sku: string;
  attributes: Record<string, unknown>;
};

type Tag = { id: string; name: string; slug: string };

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    shortDescription?: string | null;
    defaultVariantId?: string | null;
    averageRating: number;
    reviewCount: number;
    variants: Variant[];
  };
  images: ProductImage[];
  tags: Tag[];
};

function variantImageUrl(variant: Variant): string | null {
  const attrs = variant.attributes as { imageUrl?: string };
  return attrs?.imageUrl || null;
}

export function ProductDetailClient({ product, images, tags }: Props) {
  const [selectedId, setSelectedId] = useState(
    product.defaultVariantId || product.variants[0]?.id || ''
  );

  const selectedVariant = product.variants.find((v) => v.id === selectedId) || product.variants[0];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProductGallery
        images={images}
        productName={product.name}
        variantImageUrl={selectedVariant ? variantImageUrl(selectedVariant) : null}
      />

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link key={tag.id} href={`/search?tags=${tag.slug}`}>
              <Badge variant="secondary">{tag.name}</Badge>
            </Link>
          ))}
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">{product.name}</h1>
        <p className="mt-2 text-muted-foreground">
          ★ {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
        </p>
        {selectedVariant && (
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold">{formatPrice(selectedVariant.price)}</span>
            {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
              <>
                <span className="text-lg line-through text-muted-foreground">{formatPrice(selectedVariant.compareAtPrice)}</span>
                <Badge variant="sale">-{getDiscountPercent(selectedVariant.price, selectedVariant.compareAtPrice)}%</Badge>
              </>
            )}
          </div>
        )}

        <AddToCartSection
          product={product}
          selectedId={selectedId}
          onVariantChange={setSelectedId}
        />

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-primary" /> Secure checkout</span>
          <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-primary" /> Free shipping $75+</span>
          <span className="flex items-center gap-1"><RotateCcw className="h-4 w-4 text-primary" /> 30-day returns</span>
        </div>

        {product.shortDescription && (
          <p className="mt-6 text-muted-foreground">{product.shortDescription}</p>
        )}
      </div>
    </div>
  );
}
