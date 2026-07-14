'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Address = {
  id: string;
  label?: string | null;
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
};

const emptyForm = {
  label: '', firstName: '', lastName: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US', phone: '',
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const res = await fetch('/api/account/addresses');
    const data = await res.json();
    setAddresses(data.addresses || []);
  }

  useEffect(() => { load(); }, []);

  function startEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({
      label: addr.label || '',
      firstName: addr.firstName,
      lastName: addr.lastName,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state || '',
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone || '',
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/account/addresses/${editingId}` : '/api/account/addresses';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(editingId ? 'Address updated' : 'Address saved');
      cancelForm();
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to save');
    }
  }

  async function deleteAddress(id: string) {
    if (!confirm('Delete this address?')) return;
    const res = await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Address deleted');
      load();
    }
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/account/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      toast.success('Default address updated');
      load();
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Addresses</h1>
        <Button onClick={() => { cancelForm(); setShowForm(true); }}>Add address</Button>
      </div>

      {showForm && (
        <form onSubmit={saveAddress} className="mt-6 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          {(['label', 'firstName', 'lastName', 'line1', 'line2', 'city', 'state', 'postalCode', 'phone'] as const).map((f) => (
            <div key={f}>
              <Label>{f}</Label>
              <Input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required={f !== 'line2' && f !== 'phone' && f !== 'state' && f !== 'label'} />
            </div>
          ))}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">{editingId ? 'Update address' : 'Save address'}</Button>
            <Button type="button" variant="outline" onClick={cancelForm}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {addresses.length === 0 ? (
          <p className="text-muted-foreground">No saved addresses. Add a delivery address to speed up checkout.</p>
        ) : (
          addresses.map((a) => (
            <div key={a.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  {a.isDefault && <span className="text-xs font-medium text-primary">Default</span>}
                  {a.label && <span className="ml-2 text-xs text-muted-foreground">{a.label}</span>}
                  <p className="font-medium">{a.firstName} {a.lastName}</p>
                  <p className="text-sm text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.postalCode}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!a.isDefault && (
                    <Button variant="outline" size="sm" onClick={() => setDefault(a.id)}>Set default</Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => startEdit(a)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteAddress(a.id)}>Delete</Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
