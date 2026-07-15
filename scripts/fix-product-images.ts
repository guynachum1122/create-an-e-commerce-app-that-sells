import { PrismaClient } from '@prisma/client';
import { categoryImageUrl, productImageUrl } from '../lib/products/product-images';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      categories: { include: { category: true } },
    },
  });

  let updated = 0;
  for (const product of products) {
    const categorySlug = product.categories[0]?.category.slug ?? null;

    if (product.images[0]) {
      await prisma.productImage.update({
        where: { id: product.images[0].id },
        data: {
          url: productImageUrl(product.slug, 0, categorySlug),
          altText: product.name,
        },
      });
      updated++;
    }
    if (product.images[1]) {
      await prisma.productImage.update({
        where: { id: product.images[1].id },
        data: {
          url: productImageUrl(product.slug, 1, categorySlug),
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
      data: { imageUrl: categoryImageUrl(category.slug) },
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
