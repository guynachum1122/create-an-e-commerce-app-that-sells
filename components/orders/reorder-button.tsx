'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ReorderButton({ items }: { items: { variantId: string; quantity: number; productName: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function reorder() {
    setLoading(true);
    let added = 0;
    let skipped = 0;
    for (const item of items) {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: item.variantId, quantity: item.quantity }),
      });
      if (res.ok) added++;
      else skipped++;
    }
    setLoading(false);
    if (added > 0) {
      toast.success(`Added ${added} item${added !== 1 ? 's' : ''} to cart`);
      router.push('/cart');
    }
    if (skipped > 0) {
      toast.error(`${skipped} item${skipped !== 1 ? 's were' : ' was'} out of stock and skipped`);
    }
  }

  return (
    <Button variant="outline" onClick={reorder} disabled={loading}>
      {loading ? 'Adding…' : 'Reorder'}
    </Button>
  );
}
