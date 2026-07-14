'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { escapeHtml } from '@/lib/utils';
import { toast } from 'sonner';

export function ReviewModeration({
  review,
}: {
  review: {
    id: string;
    rating: number;
    body: string;
    isVisible: boolean;
    product: { name: string };
    user: { name?: string | null; email: string };
  };
}) {
  const router = useRouter();

  async function toggleVisibility() {
    const res = await fetch(`/api/admin/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !review.isVisible }),
    });
    if (res.ok) {
      toast.success('Review updated');
      router.refresh();
    }
  }

  async function deleteReview() {
    if (!confirm('Delete this review?')) return;
    const res = await fetch(`/api/admin/reviews/${review.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Review deleted');
      router.refresh();
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex justify-between">
        <div>
          <p className="font-semibold">{review.product.name} · ★ {review.rating}</p>
          <p className="text-sm text-muted-foreground">{review.user.name || review.user.email}</p>
          <p className="mt-2 text-sm">{escapeHtml(review.body)}</p>
        </div>
        <span className={`text-xs ${review.isVisible ? 'text-green-600' : 'text-red-600'}`}>
          {review.isVisible ? 'Visible' : 'Hidden'}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={toggleVisibility}>
          {review.isVisible ? 'Hide' : 'Show'}
        </Button>
        <Button size="sm" variant="destructive" onClick={deleteReview}>Delete</Button>
      </div>
    </div>
  );
}
