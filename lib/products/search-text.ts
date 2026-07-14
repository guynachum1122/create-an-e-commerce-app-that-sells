/** Build searchable text blob for PostgreSQL FTS */
export function buildSearchText(parts: {
  name: string;
  description: string;
  shortDescription?: string | null;
  ingredients: string;
  tagNames?: string[];
  categoryNames?: string[];
}): string {
  return [
    parts.name,
    parts.shortDescription,
    parts.description,
    parts.ingredients,
    ...(parts.tagNames || []),
    ...(parts.categoryNames || []),
  ]
    .filter(Boolean)
    .join(' ');
}

export async function updateProductSearchText(
  prisma: { product: { update: (args: unknown) => Promise<unknown> } },
  productId: string,
  searchText: string
) {
  await prisma.product.update({
    where: { id: productId },
    data: { searchText },
  });
}
