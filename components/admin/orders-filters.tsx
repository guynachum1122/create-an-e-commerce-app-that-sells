'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminOrdersFilters({
  initial,
}: {
  initial: { status?: string; email?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(initial.email || '');
  const [from, setFrom] = useState(initial.from || '');
  const [to, setTo] = useState(initial.to || '');

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    if (email) params.set('email', email); else params.delete('email');
    if (from) params.set('from', from); else params.delete('from');
    if (to) params.set('to', to); else params.delete('to');
    router.push(`/admin/orders?${params.toString()}`);
  }

  function clear() {
    setEmail('');
    setFrom('');
    setTo('');
    router.push('/admin/orders');
  }

  return (
    <div className="mt-4 grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-4">
      <div>
        <Label>Customer email</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Search by email" />
      </div>
      <div>
        <Label>From date</Label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <Label>To date</Label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="flex items-end gap-2">
        <Button onClick={apply}>Filter</Button>
        <Button variant="outline" onClick={clear}>Clear</Button>
      </div>
    </div>
  );
}
