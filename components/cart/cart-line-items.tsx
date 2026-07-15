'use client';

import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RemoteImage } from '@/components/ui/remote-image';
import { toast } from 'sonner';

type Item = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    name: string;
    price: number;
    stockQuantity: number;
    product: { name: string; slug: string; images: { url: string }[] };
  };
};

export function CartLineItems({ items }: { items: Item[] }) {
  const router = useRouter();

  async function updateQty(itemId: string, quantity: number) {
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity }),
    });
    if (res.ok) router.refresh();
    else toast.error('Could not update quantity');
  }

  async function removeItem(itemId: string) {
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex gap-4 rounded-lg border bg-card p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
            {item.variant.product.images[0] && (
              <RemoteImage src={item.variant.product.images[0].url} alt="" fill className="object-cover" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{item.variant.product.name}</p>
            <p className="text-sm text-muted-foreground">{item.variant.name}</p>
            <p className="mt-1 font-medium">{formatPrice(item.variant.price * item.quantity)}</p>
            <div className="mt-2 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => updateQty(item.id, Math.max(1, item.quantity - 1))}>−</Button>
              <span>{item.quantity}</span>
              <Button variant="outline" size="sm" onClick={() => updateQty(item.id, Math.min(item.variant.stockQuantity, item.quantity + 1))}>+</Button>
              <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>Remove</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
