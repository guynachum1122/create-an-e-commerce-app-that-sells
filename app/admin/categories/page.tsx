'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', imageUrl: '', sortOrder: '0',
  });

  async function load() {
    const res = await fetch('/api/admin/categories');
    const data = await res.json();
    setCategories(data.categories || []);
  }

  useEffect(() => { load(); }, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      }),
    });
    if (res.ok) {
      toast.success('Category created');
      setShowForm(false);
      setForm({ name: '', slug: '', description: '', imageUrl: '', sortOrder: '0' });
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to create');
    }
  }

  async function toggleActive(cat: Category) {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    if (res.ok) {
      toast.success(cat.isActive ? 'Category deactivated' : 'Category activated');
      load();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={() => setShowForm(!showForm)}>Add category</Button>
      </div>

      {showForm && (
        <form onSubmit={createCategory} className="mt-6 grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
              required
            />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Image URL (HTTPS)</Label>
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <div>
            <Label>Sort order</Label>
            <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create category</Button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Products</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b">
                <td className="p-3 font-medium">{cat.name}</td>
                <td className="p-3 font-mono text-xs">{cat.slug}</td>
                <td className="p-3">{cat._count?.products ?? 0}</td>
                <td className="p-3">{cat.isActive ? 'Active' : 'Inactive'}</td>
                <td className="p-3">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(cat)}>
                    {cat.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
