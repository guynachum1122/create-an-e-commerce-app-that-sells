'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBasket } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CartItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  variant: {
    id: string;
    name: string;
    price: number;
    stockQuantity: number;
    product: { name: string; slug: string; images: { url: string }[] };
  };
};

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  async function loadCart() {
    const res = await fetch('/api/cart');
    const data = await res.json();
    setItems(data.items || []);
    setSubtotal(data.subtotal || 0);
  }

  useEffect(() => {
    if (open) loadCart();
  }, [open]);

  async function updateQty(itemId: string, quantity: number) {
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity }),
    });
    if (res.ok) loadCart();
    else toast.error('Could not update quantity');
  }

  async function removeItem(itemId: string) {
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    loadCart();
    toast.success('Removed from cart');
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Your cart ({items.reduce((s, i) => s + i.quantity, 0)})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <ShoppingBasket className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-semibold">Your cart is empty</p>
            <p className="mt-2 text-sm text-muted-foreground">Browse today&apos;s deals or shop by category — your cart saves automatically.</p>
            <Button asChild className="mt-6"><Link href="/category/deals">Shop best deals</Link></Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              {items.map((item) => {
                const unit = item.unitPrice ?? item.variant.price;
                return (
                  <div key={item.id} className="mb-4 flex gap-3 border-b pb-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.variant.product.images[0] && (
                        <Image src={item.variant.product.images[0].url} alt="" fill className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Link href={`/products/${item.variant.product.slug}`} className="font-medium hover:underline">
                        {item.variant.product.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.variant.name}</p>
                      <p className="text-sm font-semibold">{formatPrice(unit * item.quantity)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateQty(item.id, Math.max(1, item.quantity - 1))}>−</Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button variant="outline" size="sm" onClick={() => updateQty(item.id, Math.min(item.variant.stockQuantity, item.quantity + 1))}>+</Button>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>Remove</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-4">
              <div className="mb-4 flex justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Button asChild className="w-full" onClick={() => onOpenChange(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link href="/cart">View full cart</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
