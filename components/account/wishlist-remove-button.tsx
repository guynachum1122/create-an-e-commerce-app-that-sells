'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function WishlistRemoveButton({ productId }: { productId: string }) {
  async function remove() {
    const res = await fetch('/api/wishlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      toast.success('Removed from wishlist');
      window.location.reload();
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={remove} aria-label="Remove from wishlist">
      <Heart className="h-5 w-5 fill-current text-red-500" />
    </Button>
  );
}
