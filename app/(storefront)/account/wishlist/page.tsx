import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { resolveCatalogProduct } from '@/lib/products/product-images';
import { noIndexMetadata } from '@/lib/seo/metadata';
import { ProductCard } from '@/components/product/product-card';
import { WishlistRemoveButton } from '@/components/account/wishlist-remove-button';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export const metadata = noIndexMetadata('Wishlist');

export default async function WishlistPage() {
  const session = await auth();
  const items = await prisma.wishlistItem.findMany({
    where: { userId: session!.user.id },
    include: {
      product: {
        include: {
          images: { take: 1 },
          variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
          tags: { include: { tag: true } },
        },
      },
    },
  });

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center px-4 py-16 text-center">
        <Heart className="h-16 w-16 text-muted-foreground/50" />
        <h1 className="mt-4 text-2xl font-semibold">Save foods you love</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">Tap the heart on any product to compare later.</p>
        <Button asChild className="mt-6"><Link href="/">Explore featured products</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Wishlist</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map(({ product }) => {
          const resolved = resolveCatalogProduct(product);
          return (
          <div key={product.id} className="relative">
            <div className="absolute right-2 top-2 z-10">
              <WishlistRemoveButton productId={product.id} />
            </div>
            <ProductCard product={{ ...resolved, averageRating: Number(resolved.averageRating) }} />
          </div>
          );
        })}
      </div>
    </div>
  );
}
