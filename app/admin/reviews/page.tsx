import { prisma } from '@/lib/db';
import { ReviewModeration } from '@/components/admin/review-moderation';

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    include: {
      product: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Review Moderation</h1>
      <div className="mt-6 space-y-4">
        {reviews.map((review) => (
          <ReviewModeration key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
