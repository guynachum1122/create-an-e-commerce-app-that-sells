import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { prisma } from '@/lib/db';

export async function SiteFooter() {
  let categories: { id: string; name: string; slug: string }[] = [];
  try {
    categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      take: 8,
    });
  } catch {
    // Build-time or transient DB outages: render footer without category links.
  }

  return (
    <footer className="border-t bg-secondary/30">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-2 font-display font-bold text-primary">
            <Leaf className="h-5 w-5" />
            Harvest Basket
          </div>
          <p className="text-sm text-muted-foreground">
            Food that fits your life—and your labels. Nutrition facts on every product.
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Shop</h3>
          <ul className="space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="text-muted-foreground hover:text-foreground">
                  {c.name}
                </Link>
              </li>
            ))}
            <li><Link href="/search" className="text-muted-foreground hover:text-foreground">Search</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Account</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/login" className="text-muted-foreground hover:text-foreground">Sign in</Link></li>
            <li><Link href="/register" className="text-muted-foreground hover:text-foreground">Create account</Link></li>
            <li><Link href="/account/orders" className="text-muted-foreground hover:text-foreground">Order history</Link></li>
            <li><Link href="/account/wishlist" className="text-muted-foreground hover:text-foreground">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy policy</Link></li>
            <li><Link href="/docs" className="text-muted-foreground hover:text-foreground">AI Blueprint / Docs</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © 2026 Harvest Basket. Secure payments · GDPR compliant · Nutrition info on every product.
      </div>
    </footer>
  );
}
