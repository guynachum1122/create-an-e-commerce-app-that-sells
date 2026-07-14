'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getStockStatus } from '@/lib/utils';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { Heart } from 'lucide-react';

type Variant = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  sku: string;
};

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    defaultVariantId?: string | null;
    variants: Variant[];
  };
  selectedId?: string;
  onVariantChange?: (id: string) => void;
};

export function AddToCartSection({ product, selectedId: controlledId, onVariantChange }: Props) {
  const [internalId, setInternalId] = useState(
    product.defaultVariantId || product.variants[0]?.id || ''
  );
  const selectedId = controlledId ?? internalId;
  const setSelectedId = onVariantChange ?? setInternalId;

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const variant = product.variants.find((v) => v.id === selectedId) || product.variants[0];
  const stockStatus = variant ? getStockStatus(variant.stockQuantity, variant.lowStockThreshold) : 'OUT_OF_STOCK';

  async function addToCart() {
    if (!variant || stockStatus === 'OUT_OF_STOCK') return;
    setLoading(true);
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: variant.id, quantity }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success('Added to cart');
      trackEvent(AnalyticsEvents.ADDED_TO_CART, { productId: product.id, variantId: variant.id });
    } else {
      const data = await res.json();
      toast.error(data.error || 'Could not add to cart');
    }
  }

  async function toggleWishlist() {
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    });
    if (res.status === 401) {
      toast.error('Sign in to save items to your wishlist.');
      return;
    }
    if (res.ok) toast.success('Saved to wishlist');
  }

  return (
    <div className="mt-6 space-y-4">
      {product.variants.length > 1 && (
        <div>
          <label className="text-sm font-medium">Choose option</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <Button
                key={v.id}
                variant={selectedId === v.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedId(v.id)}
              >
                {v.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {variant && (
        <p className="text-sm">
          {stockStatus === 'IN_STOCK' && <span className="text-green-600">In stock — ready to ship</span>}
          {stockStatus === 'LOW_STOCK' && <span className="text-amber-600">Low stock — order soon ({variant.stockQuantity} left)</span>}
          {stockStatus === 'OUT_OF_STOCK' && <span className="text-destructive">Out of stock</span>}
        </p>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</Button>
          <span className="w-8 text-center">{quantity}</span>
          <Button variant="outline" size="icon" onClick={() => variant && setQuantity(Math.min(variant.stockQuantity, quantity + 1))}>+</Button>
        </div>
        <Button className="flex-1" disabled={stockStatus === 'OUT_OF_STOCK' || loading} onClick={addToCart}>
          Add to cart
        </Button>
        <Button variant="outline" size="icon" onClick={toggleWishlist} aria-label="Save to wishlist">
          <Heart className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
