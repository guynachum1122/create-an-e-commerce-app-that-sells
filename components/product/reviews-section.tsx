'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { escapeHtml } from '@/lib/utils';
import { toast } from 'sonner';

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  createdAt: Date;
  user: { name?: string | null };
};

export function ReviewsSection({
  productId,
  reviews,
  reviewCount,
  averageRating,
}: {
  productId: string;
  reviews: Review[];
  reviewCount: number;
  averageRating: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [starFilter, setStarFilter] = useState<number | null>(null);

  const filteredReviews = useMemo(
    () => (starFilter ? reviews.filter((r) => r.rating === starFilter) : reviews),
    [reviews, starFilter]
  );

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, rating, title, body }),
    });
    if (res.ok) {
      toast.success('Thanks—your review was posted');
      setShowForm(false);
      window.location.reload();
    } else {
      const data = await res.json();
      toast.error(data.error || 'We couldn\'t post your review.');
    }
  }

  return (
    <section id="reviews" className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Reviews ({reviewCount})</h2>
          <p className="text-muted-foreground">★ {averageRating.toFixed(1)} average</p>
        </div>
        <Button variant="outline" onClick={() => setShowForm(!showForm)}>Write a review</Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant={starFilter === null ? 'default' : 'outline'} size="sm" onClick={() => setStarFilter(null)}>All ratings</Button>
        {[5, 4, 3, 2, 1].map((s) => (
          <Button key={s} variant={starFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStarFilter(s)}>
            {s} ★
          </Button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submitReview} className="mt-6 rounded-lg border bg-card p-6">
          <div className="space-y-4">
            <div>
              <Label>Your rating</Label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-1 w-full rounded-md border px-3 py-2">
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}
              </select>
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Your review</Label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={20} className="mt-1 min-h-[100px] w-full rounded-md border px-3 py-2" />
            </div>
            <Button type="submit">Post review</Button>
          </div>
        </form>
      )}

      <div className="mt-8 space-y-6">
        {filteredReviews.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet — be the first to share how this tastes or fits your diet.</p>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="border-b pb-6">
              <div className="flex items-center gap-2">
                <span className="font-medium">{escapeHtml(review.user.name || 'Customer')}</span>
                <span className="text-sm text-muted-foreground">★ {review.rating}</span>
              </div>
              {review.title && <p className="mt-1 font-semibold">{escapeHtml(review.title)}</p>}
              <p className="mt-2 text-muted-foreground">{escapeHtml(review.body)}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
