import { prisma } from '@/lib/db';
import { cartSubtotal } from '@/lib/cart/service';
import { formatPrice } from '@/lib/utils';
import { getAbandonedCartCutoff, getStoreSettings } from '@/lib/store-settings';

export default async function AbandonedCartsPage() {
  const settings = await getStoreSettings();
  const cutoff = await getAbandonedCartCutoff();

  const carts = await prisma.cart.findMany({
    where: {
      lastActivityAt: { lt: cutoff },
      items: { some: {} },
    },
    include: {
      user: { select: { email: true } },
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { lastActivityAt: 'desc' },
    take: 50,
  });

  const totalLostRevenue = carts.reduce((sum, c) => sum + cartSubtotal(c.items), 0);

  const productFreq = new Map<string, { name: string; count: number }>();
  for (const cart of carts) {
    for (const item of cart.items) {
      const key = item.variant.productId;
      const existing = productFreq.get(key);
      if (existing) existing.count += item.quantity;
      else productFreq.set(key, { name: item.variant.product.name, count: item.quantity });
    }
  }
  const topProducts = [...productFreq.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold">Abandoned Carts</h1>
      <p className="text-sm text-muted-foreground">Inactive ≥{settings.abandonedCartHours}h with items</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Abandoned carts</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{carts.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Est. lost revenue</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{formatPrice(totalLostRevenue)}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Top abandoned product</p>
          <p className="mt-2 font-semibold">{topProducts[0]?.[1].name || '—'}</p>
        </div>
      </div>

      {topProducts.length > 0 && (
        <div className="mt-6 rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Top abandoned products</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {topProducts.map(([id, { name, count }]) => (
              <li key={id}>{name} — {count} units in abandoned carts</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3">Cart ID</th>
              <th className="p-3">Email</th>
              <th className="p-3">Items</th>
              <th className="p-3">Value</th>
              <th className="p-3">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {carts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No abandoned carts</td></tr>
            ) : carts.map((cart) => (
              <tr key={cart.id} className="border-b">
                <td className="p-3 font-mono text-xs">{cart.id.slice(0, 8)}…</td>
                <td className="p-3">{cart.user?.email || cart.email || 'Guest'}</td>
                <td className="p-3">{cart.items.length}</td>
                <td className="p-3">{formatPrice(cartSubtotal(cart.items))}</td>
                <td className="p-3">{new Date(cart.lastActivityAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
