import { PrismaClient } from '@prisma/client';

/** Stable, publicly reachable product photos (no API key, no 404s). */
function productImageUrl(slug: string, variant = 0) {
  const seed = variant ? `${slug}-${variant}` : slug;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/800`;
}

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });

  let updated = 0;
  for (const product of products) {
    if (product.images[0]) {
      await prisma.productImage.update({
        where: { id: product.images[0].id },
        data: { url: productImageUrl(product.slug), altText: product.name },
      });
      updated++;
    }
    if (product.images[1]) {
      await prisma.productImage.update({
        where: { id: product.images[1].id },
        data: {
          url: productImageUrl(product.slug, 1),
          altText: `${product.name} — alternate view`,
        },
      });
      updated++;
    }
  }

  const categories = await prisma.category.findMany();
  for (const category of categories) {
    await prisma.category.update({
      where: { id: category.id },
      data: { imageUrl: productImageUrl(`category-${category.slug}`) },
    });
  }

  console.log(`Updated ${updated} product images and ${categories.length} category images.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
