'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type Tag = { id: string; name: string; slug: string };

export function CategoryFilters({
  tags,
  attributeOptions = {},
  isSearchPage = false,
}: {
  tags: Tag[];
  attributeOptions?: Record<string, string[]>;
  isSearchPage?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <aside className="w-full shrink-0 lg:w-72">
      <h2 className="font-semibold">Filters</h2>
      <div className="mt-4 space-y-6 rounded-lg border bg-card p-4">
        <div>
          <Label>Minimum rating</Label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={searchParams.get('rating') || ''}
            onChange={(e) => updateParam('rating', e.target.value || null)}
          >
            <option value="">Any rating</option>
            <option value="4">4 stars & up</option>
            <option value="3">3 stars & up</option>
          </select>
        </div>
        <div>
          <Label>Price range (cents)</Label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              placeholder="Min"
              className="w-full rounded-md border px-2 py-1"
              defaultValue={searchParams.get('minPrice') || ''}
              onBlur={(e) => updateParam('minPrice', e.target.value || null)}
            />
            <input
              type="number"
              placeholder="Max"
              className="w-full rounded-md border px-2 py-1"
              defaultValue={searchParams.get('maxPrice') || ''}
              onBlur={(e) => updateParam('maxPrice', e.target.value || null)}
            />
          </div>
        </div>
        <div>
          <Label>Diet & tags</Label>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={searchParams.get('tags')?.split(',').includes(tag.slug)}
                  onChange={(e) => {
                    const current = searchParams.get('tags')?.split(',').filter(Boolean) || [];
                    const next = e.target.checked
                      ? [...current, tag.slug]
                      : current.filter((s) => s !== tag.slug);
                    updateParam('tags', next.length ? next.join(',') : null);
                  }}
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={searchParams.get('inStock') === 'true'}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : null)}
          />
          In stock only
        </label>
        {Object.entries(attributeOptions).map(([key, values]) => (
          <div key={key}>
            <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
              {values.map((value) => {
                const paramKey = `attr_${key}`;
                const current = searchParams.get(paramKey)?.split(',').filter(Boolean) || [];
                return (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={current.includes(value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...current, value]
                          : current.filter((v) => v !== value);
                        updateParam(paramKey, next.length ? next.join(',') : null);
                      }}
                    />
                    {value}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <div>
          <Label>Sort</Label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={searchParams.get('sort') || (isSearchPage ? 'relevance' : 'featured')}
            onChange={(e) => updateParam('sort', e.target.value)}
          >
            {isSearchPage && <option value="relevance">Relevance</option>}
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating-desc">Highest rated</option>
            <option value="newest">Newest</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
        <Button variant="outline" className="w-full" onClick={() => router.push(pathname)}>Clear all filters</Button>
      </div>
    </aside>
  );
}
