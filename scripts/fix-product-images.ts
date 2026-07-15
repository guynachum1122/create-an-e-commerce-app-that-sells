import { PrismaClient } from '@prisma/client';

/** Verified Unsplash food photos (GET 200). */
const WORKING_FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e549e2df3771?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1481070555726-e2fe8357725b?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1511690656952-0f67a0e2a3c8?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1490645934777-92fd41b2ec18?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1482049010119-d63874965987?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1565958011703-39840bea1134?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1476224200861-5aad369c5502?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1574489441777-0a916686375f?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1606787366850-94e1c4c2d693?auto=format&fit=crop&w=800&h=800&q=80',
  'https://images.unsplash.com/photo-1613478223719-0be173ed6d70?auto=format&fit=crop&w=800&h=800&q=80',
];

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });

  let updated = 0;
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const primaryUrl = WORKING_FOOD_IMAGES[i % WORKING_FOOD_IMAGES.length];
    const secondaryUrl = WORKING_FOOD_IMAGES[(i + 1) % WORKING_FOOD_IMAGES.length];

    if (product.images[0]) {
      await prisma.productImage.update({
        where: { id: product.images[0].id },
        data: { url: primaryUrl, altText: product.name },
      });
      updated++;
    }

    if (product.images[1]) {
      await prisma.productImage.update({
        where: { id: product.images[1].id },
        data: { url: secondaryUrl, altText: `${product.name} — alternate view` },
      });
      updated++;
    }
  }

  const categoryImages = WORKING_FOOD_IMAGES.slice(0, 3);
  const categories = await prisma.category.findMany({ where: { imageUrl: { not: null } } });
  for (let i = 0; i < categories.length; i++) {
    await prisma.category.update({
      where: { id: categories[i].id },
      data: { imageUrl: categoryImages[i % categoryImages.length] },
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
