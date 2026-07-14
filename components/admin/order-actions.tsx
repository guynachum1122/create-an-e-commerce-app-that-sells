'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function AdminOrderActions({
  orderId,
  currentStatus,
  trackingNumber,
  trackingUrl,
}: {
  orderId: string;
  currentStatus: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [tracking, setTracking] = useState(trackingNumber || '');
  const [url, setUrl] = useState(trackingUrl || '');
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, trackingNumber: tracking, trackingUrl: url }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success('Order updated');
      router.refresh();
    } else {
      toast.error('Update failed');
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border px-2 py-1 text-sm">
        {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <Input placeholder="Tracking #" value={tracking} onChange={(e) => setTracking(e.target.value)} className="max-w-[140px]" />
      <Input placeholder="Tracking URL" value={url} onChange={(e) => setUrl(e.target.value)} className="max-w-[200px]" />
      <Button size="sm" onClick={save} disabled={loading}>Save</Button>
    </div>
  );
}
