'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';

type TopProduct = {
  productId: string;
  productName: string;
  _sum: { lineTotal: number | null; quantity: number | null };
};

type DashboardData = {
  orders: number;
  totalRevenue: number;
  aov: number;
  newCustomers: number;
  abandonedCarts: number;
  topByRevenue?: TopProduct[];
  topByUnits?: TopProduct[];
};

export function AdminDashboardClient({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  async function loadRange(d: number) {
    setDays(d);
    setLoading(true);
    const res = await fetch(`/api/admin/dashboard?days=${d}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  return (
    <>
      <div className="mt-4 flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => loadRange(d)}
            className={`rounded-md px-3 py-1 text-sm ${days === d ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            {d}d
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: `Revenue (${days}d)`, value: formatPrice(data.totalRevenue) },
          { label: `Orders (${days}d)`, value: String(data.orders) },
          { label: 'AOV', value: formatPrice(data.aov) },
          { label: 'New customers', value: String(data.newCustomers) },
          { label: 'Abandoned carts', value: String(data.abandonedCarts) },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '…' : kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Top products by revenue ({days}d)</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Units</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(data.topByRevenue || []).slice(0, 10).map((row) => (
                  <tr key={row.productId} className="border-b">
                    <td className="py-2">{row.productName}</td>
                    <td className="py-2 text-right tabular-nums">{row._sum.quantity ?? 0}</td>
                    <td className="py-2 text-right tabular-nums">{formatPrice(row._sum.lineTotal ?? 0)}</td>
                  </tr>
                ))}
                {!loading && !(data.topByRevenue || []).length && (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No paid orders in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Top products by units ({days}d)</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Units sold</th>
                </tr>
              </thead>
              <tbody>
                {(data.topByUnits || []).slice(0, 10).map((row) => (
                  <tr key={row.productId} className="border-b">
                    <td className="py-2">{row.productName}</td>
                    <td className="py-2 text-right tabular-nums">{row._sum.quantity ?? 0}</td>
                  </tr>
                ))}
                {!loading && !(data.topByUnits || []).length && (
                  <tr><td colSpan={2} className="py-4 text-center text-muted-foreground">No paid orders in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
