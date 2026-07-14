import Link from 'next/link';
import { getOrCreateCart, cartSubtotal, cartItemCount } from '@/lib/cart/service';
import { formatPrice } from '@/lib/utils';
import { noIndexMetadata } from '@/lib/seo/metadata';
import { Button } from '@/components/ui/button';
import { CartLineItems } from '@/components/cart/cart-line-items';
import { ShoppingBasket } from 'lucide-react';

export const metadata = noIndexMetadata('Shopping Cart');

export default async function CartPage() {
  const cart = await getOrCreateCart();
  const subtotal = cartSubtotal(cart.items);
  const count = cartItemCount(cart.items);

  if (count === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center px-4 py-16 text-center">
        <ShoppingBasket className="h-16 w-16 text-muted-foreground/50" />
        <h1 className="mt-4 text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse by category or search for a specific diet.</p>
        <Button asChild className="mt-6"><Link href="/">Browse categories</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Shopping cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CartLineItems items={cart.items} />
        </div>
        <div className="rounded-lg border bg-card p-6 lg:sticky lg:top-24 lg:h-fit">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Shipping calculated at checkout</p>
          <Button asChild className="mt-6 w-full"><Link href="/checkout">Proceed to checkout</Link></Button>
          <Button asChild variant="outline" className="mt-2 w-full"><Link href="/">Continue shopping</Link></Button>
        </div>
      </div>
    </div>
  );
}
