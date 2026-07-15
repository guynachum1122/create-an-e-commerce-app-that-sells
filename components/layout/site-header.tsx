'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, ShoppingCart, User, Heart, Leaf, BookOpen, Menu, X } from 'lucide-react';
import { RemoteImage } from '@/components/ui/remote-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { CartDrawer } from '@/components/cart/cart-drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSession, signOut } from 'next-auth/react';

function SearchForm({
  query,
  setQuery,
  suggestions,
  setSuggestions,
  onSubmit,
  className,
}: {
  query: string;
  setQuery: (v: string) => void;
  suggestions: {
    products: { name: string; slug: string; images: { url: string }[] }[];
    categories: { name: string; slug: string }[];
    tags: { name: string; slug: string }[];
  } | null;
  setSuggestions: (v: null) => void;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={`relative ${className || ''}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods, categories, or tags…"
        className="h-10 rounded-full border-0 bg-secondary pl-10"
        aria-label="Search products"
      />
      {suggestions && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover p-2 shadow-lg">
          {suggestions.products.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Products</p>
              {suggestions.products.map((p) => (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                  onClick={() => setSuggestions(null)}
                >
                  {p.images[0] && (
                    <RemoteImage src={p.images[0].url} alt="" className="h-8 w-8 rounded object-cover" />
                  )}
                  <span className="text-sm">{p.name}</span>
                </Link>
              ))}
            </div>
          )}
          {suggestions.categories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent" onClick={() => setSuggestions(null)}>
              Category: {c.name}
            </Link>
          ))}
          {suggestions.tags.map((t) => (
            <Link key={t.slug} href={`/search?tags=${t.slug}`} className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent" onClick={() => setSuggestions(null)}>
              Tag: {t.name}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [suggestions, setSuggestions] = useState<{
    products: { name: string; slug: string; images: { url: string }[] }[];
    categories: { name: string; slug: string }[];
    tags: { name: string; slug: string }[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/cart')
      .then((r) => r.json())
      .then((d) => setCartCount(d.itemCount || 0))
      .catch(() => {});
  }, [cartOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions(null);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setSuggestions)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSuggestions(null);
      setSearchOpen(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-16 items-center gap-2 px-4 lg:h-[4.5rem] lg:gap-4 lg:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <Leaf className="h-6 w-6" />
            <span className="hidden sm:inline">Harvest Basket</span>
          </Link>

          <SearchForm
            query={query}
            setQuery={setQuery}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            onSubmit={handleSearch}
            className="hidden flex-1 max-w-xl md:block"
          />

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild>
              <Link href={session ? '/account/wishlist' : '/login?callbackUrl=/account/wishlist'} aria-label="Wishlist">
                <Heart className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)} aria-label="Open cart">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-warm-500 px-1 text-xs font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {session?.user ? (
                  <>
                    <DropdownMenuItem asChild><Link href="/account">My account</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/account/orders">Orders</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/account/profile">Profile</Link></DropdownMenuItem>
                    {session.user.role === 'ADMIN' && (
                      <DropdownMenuItem asChild><Link href="/admin">Admin</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>Sign out</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild><Link href="/login">Sign in</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/register">Create account</Link></DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
              <Link href="/docs" aria-label="Project Docs" title="AI Blueprint">
                <BookOpen className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-background/95 p-4 md:hidden">
          <div className="flex items-center gap-2">
            <SearchForm
              query={query}
              setQuery={setQuery}
              suggestions={suggestions}
              setSuggestions={setSuggestions}
              onSubmit={handleSearch}
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)} aria-label="Close search">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-3">
            <Link href="/" className="text-sm font-medium" onClick={() => setMobileNavOpen(false)}>Home</Link>
            <Link href="/search?sort=discount" className="text-sm font-medium" onClick={() => setMobileNavOpen(false)}>Today&apos;s deals</Link>
            <Link href="/docs" className="text-sm font-medium" onClick={() => setMobileNavOpen(false)}>Project Docs</Link>
            <Link href="/account" className="text-sm font-medium" onClick={() => setMobileNavOpen(false)}>Account</Link>
          </nav>
        </SheetContent>
      </Sheet>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
