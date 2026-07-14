import Link from 'next/link';

const nav = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/abandoned-carts', label: 'Abandoned Carts' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/analytics', label: 'Analytics' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-primary">Harvest Basket Admin</span>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to store</Link>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r bg-card p-4 md:block">
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm hover:bg-muted">
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
