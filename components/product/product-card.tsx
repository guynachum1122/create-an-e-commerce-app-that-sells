'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plus, Heart } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, getDiscountPercent, getStockStatus } from '@/lib/utils';
import { toast } from 'sonner';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    averageRating: number | { toString(): string };
    reviewCount: number;
    images: { url: string; altText?: string | null }[];
    variants: {
      id: string;
      price: number;
      compareAtPrice?: number | null;
      stockQuantity: number;
      lowStockThreshold: number;
    }[];
    tags?: { tag: { name: string; slug: string } }[];
  };
  showQuickAdd?: boolean;
  showWishlist?: boolean;
  initialWishlisted?: boolean;
};

export function ProductCard({
  product,
  showQuickAdd = true,
  showWishlist = false,
  initialWishlisted = false,
}: ProductCardProps) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const variant = product.variants.find((v) => v.stockQuantity > 0) || product.variants[0];
  const discount = variant ? getDiscountPercent(variant.price, variant.compareAtPrice) : null;
  const stockStatus = variant ? getStockStatus(variant.stockQuantity, variant.lowStockThreshold) : 'OUT_OF_STOCK';
  const image = product.images[0];

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!variant || stockStatus === 'OUT_OF_STOCK') return;

    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
    });

    if (res.ok) {
      toast.success('Added to cart');
      trackEvent(AnalyticsEvents.ADDED_TO_CART, { productId: product.id, variantId: variant.id });
    } else {
      const data = await res.json();
      toast.error(data.error || 'Could not add to cart');
    }
  }

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    });

    if (res.status === 401) {
      toast.error('Sign in to save items to your wishlist.');
      router.push('/login');
      return;
    }

    if (!res.ok) {
      toast.error('Could not update wishlist');
      return;
    }

    const data = await res.json();
    setWishlisted(data.added);
    toast.success(data.added ? 'Saved to wishlist' : 'Removed from wishlist');
    if (data.added) {
      trackEvent(AnalyticsEvents.ADDED_TO_WISHLIST, { productId: product.id });
    }
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <article className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {image ? (
            <Image src={image.url} alt={image.altText || product.name} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width:768px) 50vw, 25vw" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
          )}
          {discount && <Badge variant="sale" className="absolute left-2 top-2">-{discount}%</Badge>}
          {showWishlist && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-2 top-2 h-9 w-9 rounded-full"
              onClick={toggleWishlist}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          )}
          {showQuickAdd && stockStatus !== 'OUT_OF_STOCK' && (
            <Button
              size="icon"
              className="absolute bottom-2 right-2 h-9 w-9 rounded-full opacity-100 shadow-md lg:opacity-0 lg:group-hover:opacity-100"
              onClick={quickAdd}
              aria-label="Quick add to cart"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 font-semibold">{product.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ★ {Number(product.averageRating).toFixed(1)} ({product.reviewCount})
          </p>
          {variant && (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold">{formatPrice(variant.price)}</span>
              {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
                <span className="text-sm line-through text-muted-foreground">{formatPrice(variant.compareAtPrice)}</span>
              )}
            </div>
          )}
          {stockStatus === 'OUT_OF_STOCK' && (
            <span className="mt-1 inline-block text-xs font-medium text-destructive">Out of stock</span>
          )}
          {stockStatus === 'LOW_STOCK' && variant && (
            <span className="mt-1 inline-block text-xs font-medium text-amber-600">Low stock — {variant.stockQuantity} left</span>
          )}
        </div>
      </article>
    </Link>
  );
}
