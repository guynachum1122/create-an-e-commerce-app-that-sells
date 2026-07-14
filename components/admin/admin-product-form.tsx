'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export type VariantForm = {
  id?: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  attributes: Record<string, string>;
  isActive?: boolean;
};

export type ProductFormData = {
  name: string;
  slug: string;
  description: string;
  ingredients: string;
  shortDescription: string;
  isPublished: boolean;
  isFeatured: boolean;
  categoryIds: string[];
  tagIds: string[];
  healthInfo: {
    servingSize: string;
    calories: number;
    proteinGrams: number;
    carbohydratesGrams: number;
    fatGrams: number;
    fiberGrams?: number;
    sugarGrams?: number;
    sodiumMg?: number;
    allergens: string[];
    additionalNotes?: string;
  };
  images: { url: string; altText: string; sortOrder: number; isPrimary: boolean }[];
  variants: VariantForm[];
};

type CatalogOptions = {
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
};

const defaultHealth = {
  servingSize: '1 serving',
  calories: 200,
  proteinGrams: 10,
  carbohydratesGrams: 20,
  fatGrams: 5,
  fiberGrams: 0,
  sugarGrams: 0,
  sodiumMg: 0,
  allergens: [] as string[],
  additionalNotes: '',
};

export const emptyProductForm: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  ingredients: '',
  shortDescription: '',
  isPublished: true,
  isFeatured: false,
  categoryIds: [],
  tagIds: [],
  healthInfo: { ...defaultHealth },
  images: [],
  variants: [{
    sku: '',
    name: 'Default',
    price: 999,
    compareAtPrice: null,
    stockQuantity: 10,
    lowStockThreshold: 5,
    attributes: {},
  }],
};

type AdminProductFormProps = {
  initial?: Partial<ProductFormData>;
  submitLabel: string;
  onSubmit: (data: ProductFormData) => Promise<void>;
};

export function AdminProductForm({ initial, submitLabel, onSubmit }: AdminProductFormProps) {
  const [form, setForm] = useState<ProductFormData>({ ...emptyProductForm, ...initial });
  const [options, setOptions] = useState<CatalogOptions>({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [allergenInput, setAllergenInput] = useState('');

  useEffect(() => {
    fetch('/api/admin/catalog-options')
      .then((r) => r.json())
      .then(setOptions);
  }, []);

  useEffect(() => {
    if (initial) setForm({ ...emptyProductForm, ...initial });
  }, [initial]);

  function updateVariant(index: number, patch: Partial<VariantForm>) {
    const variants = [...form.variants];
    variants[index] = { ...variants[index], ...patch };
    setForm({ ...form, variants });
  }

  function updateVariantAttributes(index: number, key: string, value: string) {
    const variants = [...form.variants];
    const attrs = { ...variants[index].attributes, [key]: value };
    if (!value) delete attrs[key];
    variants[index] = { ...variants[index], attributes: attrs };
    setForm({ ...form, variants });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  }

  return (
    <Card className="max-w-4xl">
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <h2 className="font-semibold">Basic info</h2>
            <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated if empty" /></div>
            <div><Label>Short description</Label><Input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} /></div>
            <div><Label>Description</Label><textarea required className="w-full rounded-md border px-3 py-2" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Ingredients</Label><textarea required className="w-full rounded-md border px-3 py-2" rows={3} value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} /></div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                Featured
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Categories</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(cat.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.categoryIds, cat.id]
                        : form.categoryIds.filter((id) => id !== cat.id);
                      setForm({ ...form, categoryIds: next });
                    }}
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Dietary tags</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {options.tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.tagIds.includes(tag.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.tagIds, tag.id]
                        : form.tagIds.filter((id) => id !== tag.id);
                      setForm({ ...form, tagIds: next });
                    }}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Nutrition & health</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Serving size</Label><Input value={form.healthInfo.servingSize} onChange={(e) => setForm({ ...form, healthInfo: { ...form.healthInfo, servingSize: e.target.value } })} /></div>
              <div><Label>Calories</Label><Input type="number" value={form.healthInfo.calories} onChange={(e) => setForm({ ...form, healthInfo: { ...form.healthInfo, calories: Number(e.target.value) } })} /></div>
              <div><Label>Protein (g)</Label><Input type="number" step="0.1" value={form.healthInfo.proteinGrams} onChange={(e) => setForm({ ...form, healthInfo: { ...form.healthInfo, proteinGrams: Number(e.target.value) } })} /></div>
              <div><Label>Carbs (g)</Label><Input type="number" step="0.1" value={form.healthInfo.carbohydratesGrams} onChange={(e) => setForm({ ...form, healthInfo: { ...form.healthInfo, carbohydratesGrams: Number(e.target.value) } })} /></div>
              <div><Label>Fat (g)</Label><Input type="number" step="0.1" value={form.healthInfo.fatGrams} onChange={(e) => setForm({ ...form, healthInfo: { ...form.healthInfo, fatGrams: Number(e.target.value) } })} /></div>
              <div><Label>Fiber (g)</Label><Input type="number" step="0.1" value={form.healthInfo.fiberGrams ?? 0} onChange={(e) => setForm({ ...form, healthInfo: { ...form.healthInfo, fiberGrams: Number(e.target.value) } })} /></div>
              <div><Label>Sugar (g)</Label><Input type="number" step="0.1" value={form.healthInfo.sugarGrams ?? 0} onChange={(e) => setForm({ ...form, healthInfo: { ...form.healthInfo, sugarGrams: Number(e.target.value) } })} /></div>
              <div><Label>Sodium (mg)</Label><Input type="number" value={form.healthInfo.sodiumMg ?? 0} onChange={(e) => setForm({ ...form, healthInfo: { ...form.healthInfo, sodiumMg: Number(e.target.value) } })} /></div>
            </div>
            <div>
              <Label>Allergens</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.healthInfo.allergens.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs">
                    {a}
                    <button type="button" onClick={() => setForm({ ...form, healthInfo: { ...form.healthInfo, allergens: form.healthInfo.allergens.filter((x) => x !== a) } })}>×</button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={allergenInput} onChange={(e) => setAllergenInput(e.target.value)} placeholder="e.g. milk" />
                <Button type="button" variant="outline" onClick={() => {
                  if (allergenInput.trim()) {
                    setForm({ ...form, healthInfo: { ...form.healthInfo, allergens: [...form.healthInfo.allergens, allergenInput.trim()] } });
                    setAllergenInput('');
                  }
                }}>Add</Button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Images</h2>
            {form.images.map((img, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
                <div><Label className="text-xs">URL</Label><Input value={img.url} onChange={(e) => {
                  const images = [...form.images];
                  images[i] = { ...img, url: e.target.value };
                  setForm({ ...form, images });
                }} /></div>
                <div><Label className="text-xs">Alt text</Label><Input value={img.altText} onChange={(e) => {
                  const images = [...form.images];
                  images[i] = { ...img, altText: e.target.value };
                  setForm({ ...form, images });
                }} /></div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={img.isPrimary} onChange={(e) => {
                      const images = form.images.map((im, idx) => ({ ...im, isPrimary: idx === i ? e.target.checked : false }));
                      setForm({ ...form, images });
                    }} />
                    Primary
                  </label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}>Remove</Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setForm({
              ...form,
              images: [...form.images, { url: '', altText: form.name, sortOrder: form.images.length, isPrimary: form.images.length === 0 }],
            })}>Add image</Button>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold">Variants & inventory</h2>
            {form.variants.map((v, i) => (
              <div key={v.id || i} className="space-y-3 rounded-lg border p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div><Label className="text-xs">SKU</Label><Input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} /></div>
                  <div><Label className="text-xs">Name</Label><Input value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} /></div>
                  <div><Label className="text-xs">Price (¢)</Label><Input type="number" value={v.price} onChange={(e) => updateVariant(i, { price: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Compare at (¢) — sale</Label><Input type="number" value={v.compareAtPrice ?? ''} onChange={(e) => updateVariant(i, { compareAtPrice: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label className="text-xs">Stock</Label><Input type="number" value={v.stockQuantity} onChange={(e) => updateVariant(i, { stockQuantity: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Low stock threshold</Label><Input type="number" value={v.lowStockThreshold} onChange={(e) => updateVariant(i, { lowStockThreshold: Number(e.target.value) })} /></div>
                </div>
                <div>
                  <Label className="text-xs">Attributes (flavor, size, etc.)</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {Object.entries(v.attributes).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input value={key} readOnly className="text-xs" />
                        <Input value={value} onChange={(e) => updateVariantAttributes(i, key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input placeholder="Attribute key" id={`attr-key-${i}`} />
                    <Input placeholder="Value" id={`attr-val-${i}`} />
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const keyEl = document.getElementById(`attr-key-${i}`) as HTMLInputElement;
                      const valEl = document.getElementById(`attr-val-${i}`) as HTMLInputElement;
                      if (keyEl?.value && valEl?.value) {
                        updateVariantAttributes(i, keyEl.value, valEl.value);
                        keyEl.value = '';
                        valEl.value = '';
                      }
                    }}>Add attr</Button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : submitLabel}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
