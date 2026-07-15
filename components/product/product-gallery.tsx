'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RemoteImage } from '@/components/ui/remote-image';

type ProductImage = { id: string; url: string; altText?: string | null };

export function ProductGallery({
  images,
  productName,
  variantImageUrl,
}: {
  images: ProductImage[];
  productName: string;
  variantImageUrl?: string | null;
}) {
  const gallery = images.length ? images : [{ id: 'placeholder', url: '/placeholder-product.png', altText: productName }];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mainUrl = variantImageUrl || gallery[selectedIndex]?.url || gallery[0].url;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        <RemoteImage
          src={mainUrl}
          alt=""
          fill
          className="object-cover"
          priority
        />
      </div>
      {gallery.length > 1 && !variantImageUrl && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {gallery.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2',
                i === selectedIndex ? 'border-primary' : 'border-transparent'
              )}
            >
              <RemoteImage src={img.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
