/** Food-themed product photos keyed by product slug / category. */

const PRODUCT_KEYWORDS: Record<string, string> = {
  'organic-almond-butter-granola-bar': 'granola,bar,almond',
  'sea-salt-roasted-chickpeas': 'chickpeas,snack,roasted',
  'plain-greek-yogurt-2-percent': 'yogurt,greek,dairy',
  'vanilla-plant-protein-powder': 'protein,powder,smoothie',
  'mediterranean-quinoa-bowl': 'quinoa,bowl,salad',
  'unsweetened-almond-milk': 'almond,milk,plantmilk',
  'whole-grain-penne-pasta': 'pasta,penne,grain',
  'organic-mixed-berry-blend': 'berries,frozen,fruit',
  'gluten-free-sourdough-loaf': 'bread,sourdough,bakery',
  'dark-chocolate-whey-protein-bar': 'protein,bar,chocolate',
  'almond-butter-protein-bar-dark-chocolate': 'protein,bar,almond',
  'family-night-chicken-veggie-skillet-kit': 'chicken,vegetables,dinner',
  'steel-cut-oats-cinnamon-apple': 'oats,breakfast,cinnamon',
  'extra-virgin-olive-oil-cold-pressed': 'olive,oil,bottle',
  'kid-friendly-cheese-crackers-cheddar': 'crackers,cheese,snack',
  'plant-protein-shake-vanilla-bean': 'protein,shake,vanilla',
  'low-sodium-vegetable-soup-garden-harvest': 'soup,vegetables,bowl',
  'budget-rice-bean-bowl-southwest': 'rice,beans,bowl',
  'organic-cold-brew-coffee-unsweetened': 'coffee,coldbrew,beverage',
  'mixed-nut-trail-mix-lightly-salted': 'nuts,trailmix,snack',
};

const CATEGORY_KEYWORDS: Record<string, string> = {
  snacks: 'snack,food',
  breakfast: 'breakfast,oats',
  'prepared-meals': 'dinner,meal,bowl',
  beverages: 'drink,beverage',
  'pantry-staples': 'pantry,grocery',
  'frozen-foods': 'frozen,berries',
  bakery: 'bread,bakery',
  'protein-fitness': 'protein,fitness',
  'dairy-eggs': 'dairy,yogurt',
  deals: 'grocery,food',
};

const FALLBACK_KEYWORDS = 'healthy,food,grocery';

const STOCK_PHOTO_HOSTS = ['picsum.photos', 'loremflickr.com', 'images.unsplash.com'];

function keywordsForSlug(slug: string, categorySlug?: string | null): string {
  if (PRODUCT_KEYWORDS[slug]) return PRODUCT_KEYWORDS[slug];
  if (categorySlug && CATEGORY_KEYWORDS[categorySlug]) return CATEGORY_KEYWORDS[categorySlug];
  return FALLBACK_KEYWORDS;
}

/** Stable, food-relevant remote image URL for a product or category. */
export function productImageUrl(slug: string, variant = 0, categorySlug?: string | null): string {
  const keywords = keywordsForSlug(slug, categorySlug);
  const lock = variant ? `${slug}-v${variant}` : slug;
  return `https://loremflickr.com/800/800/${keywords}/all?lock=${encodeURIComponent(lock)}`;
}

export function categoryImageUrl(categorySlug: string): string {
  const keywords = CATEGORY_KEYWORDS[categorySlug] ?? FALLBACK_KEYWORDS;
  return `https://loremflickr.com/800/800/${keywords}/all?lock=${encodeURIComponent(`category-${categorySlug}`)}`;
}

function isStockPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  try {
    const host = new URL(url).hostname;
    return STOCK_PHOTO_HOSTS.some((h) => host.includes(h));
  } catch {
    return true;
  }
}

/** Pick a food-relevant image URL for storefront display. */
export function resolveProductImageUrl(
  slug: string,
  storedUrl: string | null | undefined,
  variant = 0,
  categorySlug?: string | null,
): string {
  if (PRODUCT_KEYWORDS[slug] || isStockPhotoUrl(storedUrl)) {
    return productImageUrl(slug, variant, categorySlug);
  }
  return storedUrl ?? productImageUrl(slug, variant, categorySlug);
}

type ProductWithImages = {
  slug: string;
  images: { url: string; sortOrder?: number; [key: string]: unknown }[];
  categories?: { category: { slug: string } }[];
};

export function resolveCatalogProduct<T extends ProductWithImages>(product: T): T {
  const categorySlug = product.categories?.[0]?.category.slug ?? null;
  return {
    ...product,
    images: product.images.map((img, index) => ({
      ...img,
      url: resolveProductImageUrl(product.slug, img.url, index, categorySlug),
    })),
  };
}

export function resolveCatalogProducts<T extends ProductWithImages>(products: T[]): T[] {
  return products.map(resolveCatalogProduct);
}
