import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildSearchText } from '../lib/products/search-text';

const prisma = new PrismaClient();

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=800&h=800&fit=crop`;

async function main() {
  console.log('Seeding Harvest Basket...');

  await prisma.orderStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.healthInfo.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shippingMethod.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.storeSettings.deleteMany().catch(() => {});
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  if (process.env.NODE_ENV === 'production' && !process.env.SEED_ADMIN_PASSWORD) {
    console.warn('Skipping admin seed in production — set SEED_ADMIN_PASSWORD to create admin user.');
  } else {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin12345';
    const adminHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.create({
      data: {
        email: 'admin@harvestbasket.com',
        name: 'Admin User',
        passwordHash: adminHash,
        role: UserRole.ADMIN,
      },
    });
  }

  const customerHash = await bcrypt.hash(process.env.SEED_CUSTOMER_PASSWORD || 'customer123', 12);

  const customer = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      name: 'Maya Chen',
      passwordHash: customerHash,
      role: UserRole.CUSTOMER,
    },
  });

  await prisma.address.create({
    data: {
      userId: customer.id,
      firstName: 'Maya',
      lastName: 'Chen',
      line1: '123 Green St',
      city: 'Portland',
      state: 'OR',
      postalCode: '97201',
      country: 'US',
      phone: '555-0100',
      isDefault: true,
      label: 'Home',
    },
  });

  const shippingMethods = await Promise.all([
    prisma.shippingMethod.create({
      data: { name: 'Standard', description: 'Reliable delivery for everyday orders', price: 599, estimatedDaysMin: 3, estimatedDaysMax: 5, sortOrder: 0 },
    }),
    prisma.shippingMethod.create({
      data: { name: 'Express', description: 'Faster delivery when you need it sooner', price: 1299, estimatedDaysMin: 1, estimatedDaysMax: 2, sortOrder: 1 },
    }),
    prisma.shippingMethod.create({
      data: { name: 'Free shipping', description: 'Free on orders over $50', price: 0, estimatedDaysMin: 3, estimatedDaysMax: 5, sortOrder: 2 },
    }),
  ]);

  await prisma.promoCode.createMany({
    data: [
      { code: 'SAVE10', discountType: 'PERCENT', discountValue: 10, minOrderCents: 2000, isActive: true },
      { code: 'WELCOME5', discountType: 'FIXED', discountValue: 500, minOrderCents: 1500, maxUses: 100, isActive: true },
    ],
  });

  await prisma.storeSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', defaultLowStockThreshold: 5, taxRateBps: 0, abandonedCartHours: 24 },
    update: {},
  });

  const tagData = [
    ['healthy', 'Healthy'], ['high-protein', 'High Protein'], ['low-sugar', 'Low Sugar'],
    ['gluten-free', 'Gluten-Free'], ['vegan', 'Vegan'], ['keto', 'Keto'],
    ['kid-friendly', 'Kid-Friendly'], ['organic', 'Organic'], ['nut-free', 'Nut-Free'],
    ['low-sodium', 'Low-Sodium'], ['sugar-free', 'Sugar-Free'], ['low-carb', 'Low-Carb'],
    ['high-fiber', 'High Fiber'], ['heart-healthy', 'Heart-Healthy'], ['budget', 'Budget'],
    ['quick-prep', 'Quick Prep'],
  ] as const;

  const tags: Record<string, { id: string }> = {};
  for (const [slug, name] of tagData) {
    tags[slug] = await prisma.tag.create({ data: { slug, name } });
  }

  const categories = [
    { slug: 'snacks', name: 'Snacks', description: 'Bars, nuts, crackers, and better-for-you bites.', imageUrl: IMG('photo-1599599810769-39faba15c96a'), sortOrder: 0 },
    { slug: 'breakfast', name: 'Breakfast', description: 'Oats, granolas, and morning staples.', sortOrder: 1 },
    { slug: 'prepared-meals', name: 'Prepared Meals', description: 'Ready-to-heat lunches and dinners.', sortOrder: 2 },
    { slug: 'beverages', name: 'Beverages', description: 'Juices, plant milks, protein shakes.', sortOrder: 3 },
    { slug: 'pantry-staples', name: 'Pantry Staples', description: 'Grains, pasta, oils, and sauces.', sortOrder: 4 },
    { slug: 'frozen-foods', name: 'Frozen Foods', description: 'Frozen fruits, vegetables, and meals.', sortOrder: 5 },
    { slug: 'bakery', name: 'Bakery', description: 'Breads and baked goods.', sortOrder: 6 },
    { slug: 'protein-fitness', name: 'Protein & Fitness', description: 'Powders, bars, and high-protein staples.', sortOrder: 7 },
    { slug: 'dairy-eggs', name: 'Dairy & Eggs', description: 'Yogurt, cheese, milk, and eggs.', sortOrder: 8 },
    { slug: 'deals', name: 'Best Deals', description: 'Limited-time discounts and bundles.', sortOrder: 9 },
  ];

  const catMap: Record<string, string> = {};
  for (const c of categories) {
    const cat = await prisma.category.create({ data: c });
    catMap[c.slug] = cat.id;
  }

  type ProductSeed = {
    slug: string;
    name: string;
    description: string;
    ingredients: string;
    shortDescription: string;
    category: string;
    extraCategories?: string[];
    tagSlugs: string[];
    isFeatured?: boolean;
    image: string;
    extraImages?: string[];
    variants: { sku: string; name: string; price: number; compareAtPrice?: number; stock: number; attributes?: Record<string, string> }[];
    health: {
      servingSize: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      allergens: string[];
    };
    rating?: number;
    reviewCount?: number;
    orderCount?: number;
  };

  const products: ProductSeed[] = [
    {
      slug: 'organic-almond-butter-granola-bar',
      name: 'Organic Almond Butter Granola Bar',
      shortDescription: 'Chewy oat bar with almond butter — 12g protein per bar.',
      description: 'Our best-selling grab-and-go bar combines rolled oats, roasted almonds, and almond butter for steady energy without a sugar crash.',
      ingredients: 'Organic rolled oats, organic almond butter, organic honey, organic sunflower seeds, sea salt, vanilla extract.',
      category: 'snacks',
      extraCategories: ['protein-fitness'],
      tagSlugs: ['healthy', 'high-protein', 'organic', 'kid-friendly'],
      isFeatured: true,
      image: IMG('photo-1622484219043-4c8d8c4c8c8c'),
      extraImages: [IMG('photo-1574327766098-e967b4459a8'), IMG('photo-1593095948071-474c5f8e7926')],
      variants: [
        { sku: 'GRN-SGL', name: 'Single bar', price: 349, compareAtPrice: 399, stock: 120 },
        { sku: 'GRN-6PK', name: '6-pack', price: 1899, stock: 45 },
        { sku: 'GRN-12PK', name: '12-pack', price: 3499, stock: 30 },
      ],
      health: { servingSize: '1 bar (60g)', calories: 220, protein: 12, carbs: 28, fat: 8, fiber: 4, sugar: 8, allergens: ['tree nuts', 'wheat'] },
      rating: 4.6,
      reviewCount: 38,
      orderCount: 210,
    },
    {
      slug: 'sea-salt-roasted-chickpeas',
      name: 'Sea Salt Roasted Chickpeas',
      shortDescription: 'Crunchy, savory — 6g plant protein per serving.',
      description: 'Oven-roasted chickpeas seasoned with sea salt for a satisfying crunch.',
      ingredients: 'Chickpeas, olive oil, sea salt.',
      category: 'snacks',
      tagSlugs: ['healthy', 'vegan', 'gluten-free', 'high-protein', 'low-sodium'],
      image: IMG('photo-1574327766098-e967b4459a8'),
      variants: [
        { sku: 'CHP-4OZ', name: '4 oz', price: 429, stock: 6 },
        { sku: 'CHP-8OZ', name: '8 oz', price: 749, stock: 24 },
      ],
      health: { servingSize: '28g', calories: 120, protein: 6, carbs: 18, fat: 3, fiber: 5, sugar: 1, allergens: [] },
      rating: 4.4,
      reviewCount: 21,
      orderCount: 85,
    },
    {
      slug: 'plain-greek-yogurt-2-percent',
      name: 'Plain Greek Yogurt — 2% Milkfat',
      shortDescription: '17g protein per cup — no added sugar.',
      description: 'Strained for richness and protein density. Ideal for breakfast bowls and smoothies.',
      ingredients: 'Cultured pasteurized reduced-fat milk, live active cultures.',
      category: 'dairy-eggs',
      tagSlugs: ['healthy', 'high-protein', 'gluten-free', 'low-carb'],
      isFeatured: true,
      image: IMG('photo-1488477181946-6428a0291777'),
      variants: [
        { sku: 'YOG-16', name: '16 oz', price: 599, compareAtPrice: 649, stock: 80 },
        { sku: 'YOG-32', name: '32 oz', price: 1099, stock: 50 },
      ],
      health: { servingSize: '1 cup (227g)', calories: 150, protein: 17, carbs: 8, fat: 4, sugar: 5, allergens: ['milk'] },
      rating: 4.8,
      reviewCount: 112,
      orderCount: 340,
    },
    {
      slug: 'vanilla-plant-protein-powder',
      name: 'Vanilla Plant Protein Powder',
      shortDescription: '24g protein per scoop — pea and rice blend.',
      description: 'A complete plant protein for shakes, oats, and baking.',
      ingredients: 'Pea protein isolate, brown rice protein, natural vanilla flavor, stevia, sea salt.',
      category: 'protein-fitness',
      tagSlugs: ['high-protein', 'vegan', 'gluten-free', 'sugar-free', 'healthy'],
      isFeatured: true,
      image: IMG('photo-1593095948071-474c5f8e7926'),
      variants: [
        { sku: 'PROT-1LB', name: '1 lb', price: 3499, compareAtPrice: 3999, stock: 40 },
        { sku: 'PROT-2LB', name: '2 lb', price: 5999, stock: 25 },
      ],
      health: { servingSize: '1 scoop (32g)', calories: 120, protein: 24, carbs: 4, fat: 2, sugar: 1, allergens: [] },
      rating: 4.5,
      reviewCount: 89,
      orderCount: 175,
    },
    {
      slug: 'mediterranean-quinoa-bowl',
      name: 'Mediterranean Quinoa Bowl',
      shortDescription: 'Ready in 3 minutes — quinoa, chickpeas, roasted peppers.',
      description: 'A balanced lunch inspired by the Mediterranean diet.',
      ingredients: 'Cooked quinoa, chickpeas, roasted red peppers, cucumber, olives, lemon juice, olive oil, parsley, garlic, sea salt.',
      category: 'prepared-meals',
      tagSlugs: ['healthy', 'vegan', 'high-protein', 'gluten-free'],
      image: IMG('photo-1512621776951-a57141f2eefd'),
      variants: [
        { sku: 'MED-SGL', name: 'Single meal', price: 899, compareAtPrice: 1049, stock: 35 },
        { sku: 'MED-4PK', name: '4-pack', price: 3299, stock: 15 },
      ],
      health: { servingSize: '1 tray (285g)', calories: 380, protein: 14, carbs: 52, fat: 12, fiber: 9, sodium: 520, allergens: [] },
      rating: 4.3,
      reviewCount: 29,
      orderCount: 95,
    },
    {
      slug: 'unsweetened-almond-milk',
      name: 'Unsweetened Almond Milk',
      shortDescription: '30 calories per cup — no added sugar.',
      description: 'Creamy plant milk with zero added sugar.',
      ingredients: 'Almond milk, calcium carbonate, sea salt, vitamin E, vitamin D2, gellan gum.',
      category: 'beverages',
      tagSlugs: ['vegan', 'healthy', 'low-carb', 'sugar-free', 'gluten-free'],
      image: IMG('photo-1563636619-e9143da0883d'),
      variants: [
        { sku: 'ALM-32', name: '32 fl oz', price: 379, stock: 60 },
        { sku: 'ALM-64', name: '64 fl oz', price: 649, stock: 40 },
      ],
      health: { servingSize: '1 cup (240ml)', calories: 30, protein: 1, carbs: 1, fat: 2.5, sugar: 0, allergens: ['tree nuts'] },
      rating: 4.2,
      reviewCount: 33,
      orderCount: 120,
    },
    {
      slug: 'whole-grain-penne-pasta',
      name: 'Whole Grain Penne Pasta',
      shortDescription: '7g fiber per serving.',
      description: 'Nutty, firm whole-grain penne that holds sauce well.',
      ingredients: 'Whole durum wheat semolina.',
      category: 'pantry-staples',
      tagSlugs: ['healthy', 'vegan', 'kid-friendly'],
      image: IMG('photo-1551462147-858905a516c4'),
      variants: [
        { sku: 'PEN-16', name: '16 oz', price: 299, stock: 100 },
        { sku: 'PEN-32', name: '32 oz', price: 549, stock: 70 },
      ],
      health: { servingSize: '2 oz dry (56g)', calories: 180, protein: 7, carbs: 37, fat: 1.5, fiber: 7, allergens: ['wheat'] },
      rating: 4.4,
      reviewCount: 64,
      orderCount: 150,
    },
    {
      slug: 'organic-mixed-berry-blend',
      name: 'Organic Mixed Berry Blend',
      shortDescription: 'Flash-frozen at peak ripeness.',
      description: 'No added sugar or syrup. Perfect for smoothies and baking.',
      ingredients: 'Organic strawberries, organic blueberries, organic raspberries.',
      category: 'frozen-foods',
      tagSlugs: ['organic', 'healthy', 'vegan', 'gluten-free', 'kid-friendly'],
      image: IMG('photo-1498557850523-fd3d118b962e'),
      variants: [
        { sku: 'BRY-10', name: '10 oz', price: 599, stock: 45 },
        { sku: 'BRY-32', name: '32 oz', price: 1499, stock: 30 },
      ],
      health: { servingSize: '1 cup (140g)', calories: 70, protein: 1, carbs: 17, fat: 0, fiber: 4, sugar: 10, allergens: [] },
      rating: 4.7,
      reviewCount: 25,
      orderCount: 88,
    },
    {
      slug: 'gluten-free-sourdough-loaf',
      name: 'Gluten-Free Sourdough Loaf',
      shortDescription: 'Tangy sourdough flavor without wheat.',
      description: 'Fermented for 24 hours for authentic sourdough taste.',
      ingredients: 'Water, brown rice flour, tapioca starch, sourdough culture, olive oil, sea salt, xanthan gum.',
      category: 'bakery',
      tagSlugs: ['gluten-free', 'healthy', 'vegan'],
      image: IMG('photo-1509440159596-0249088772ff'),
      variants: [
        { sku: 'SDG-1', name: 'Single loaf', price: 799, stock: 4 },
        { sku: 'SDG-2', name: '2-pack', price: 1499, stock: 12 },
      ],
      health: { servingSize: '1 slice (38g)', calories: 90, protein: 2, carbs: 18, fat: 1, fiber: 2, sodium: 180, allergens: [] },
      rating: 4.1,
      reviewCount: 19,
      orderCount: 42,
    },
    {
      slug: 'dark-chocolate-whey-protein-bar',
      name: 'Dark Chocolate Whey Protein Bar',
      shortDescription: '20g whey protein — 3g sugar.',
      description: 'Post-workout fuel without the candy-bar sugar load.',
      ingredients: 'Whey protein isolate, dark chocolate, soluble corn fiber, almond butter, sea salt.',
      category: 'protein-fitness',
      tagSlugs: ['high-protein', 'low-carb', 'gluten-free'],
      image: IMG('photo-1606313564200-e75d5e30476c'),
      variants: [
        { sku: 'BAR-CHO', name: 'Chocolate', price: 299, compareAtPrice: 349, stock: 90, attributes: { flavor: 'Chocolate', size: 'Single' } },
        { sku: 'BAR-PB', name: 'Peanut Butter', price: 299, stock: 75, attributes: { flavor: 'Peanut Butter', size: 'Single' } },
        { sku: 'BAR-VAR', name: 'Variety 12-pack', price: 3299, stock: 20, attributes: { flavor: 'Variety', size: '12-pack' } },
      ],
      health: { servingSize: '1 bar (60g)', calories: 210, protein: 20, carbs: 22, fat: 7, sugar: 3, allergens: ['milk', 'soy'] },
      rating: 4.3,
      reviewCount: 72,
      orderCount: 200,
    },
    {
      slug: 'almond-butter-protein-bar-dark-chocolate',
      name: 'Almond Butter Protein Bar — Dark Chocolate',
      shortDescription: '20g protein, 3g sugar. Almond butter base with rich dark chocolate.',
      description: 'Built for post-workout recovery and 3 p.m. hunger. Each bar delivers 20g of complete protein from whey and almond butter.',
      ingredients: 'Whey protein isolate, almond butter, dates, dark chocolate, pea protein, natural flavors, sea salt.',
      category: 'protein-fitness',
      tagSlugs: ['high-protein', 'low-sugar', 'gluten-free'],
      isFeatured: true,
      image: IMG('photo-1606313564200-e75d5e30476c'),
      variants: [
        { sku: 'HB-PB-DCH', name: 'Single', price: 249, compareAtPrice: 299, stock: 120, attributes: { flavor: 'Dark Chocolate', size: 'Single' } },
        { sku: 'HB-PB-6PK', name: '6-pack', price: 1349, stock: 45, attributes: { flavor: 'Dark Chocolate', size: '6-pack' } },
        { sku: 'HB-PB-12PK', name: '12-pack', price: 2499, stock: 30, attributes: { flavor: 'Dark Chocolate', size: '12-pack' } },
      ],
      health: { servingSize: '1 bar (60g)', calories: 250, protein: 20, carbs: 18, fat: 8, fiber: 6, sugar: 3, sodium: 140, allergens: ['milk', 'tree nuts'] },
      rating: 4.6, reviewCount: 128, orderCount: 210,
    },
    {
      slug: 'family-night-chicken-veggie-skillet-kit',
      name: 'Family Night Chicken & Veggie Skillet Kit',
      shortDescription: 'One-pan dinner for four in under 25 minutes.',
      description: 'Skip the recipe hunt. Pre-trimmed chicken strips, broccoli, bell peppers, and mild garlic-herb sauce.',
      ingredients: 'Chicken breast strips, broccoli, bell peppers, water, olive oil, garlic, herbs, sea salt.',
      category: 'prepared-meals',
      tagSlugs: ['kid-friendly', 'high-protein'],
      image: IMG('photo-1546069901-ba9599a7e63c'),
      variants: [
        { sku: 'HB-FM-4', name: 'Serves 4', price: 1499, stock: 35, attributes: { size: 'Serves 4' } },
        { sku: 'HB-FM-2', name: 'Serves 2', price: 899, stock: 28, attributes: { size: 'Serves 2' } },
      ],
      health: { servingSize: '¼ kit', calories: 380, protein: 28, carbs: 12, fat: 14, sodium: 480, allergens: [] },
      rating: 4.4, reviewCount: 67, orderCount: 95,
    },
    {
      slug: 'steel-cut-oats-cinnamon-apple',
      name: 'Steel-Cut Oats — Cinnamon Apple',
      shortDescription: 'USDA Organic steel-cut oats with dried apple and cinnamon.',
      description: 'Slow-release energy without the sugar spike. Cooks in 3 minutes in the microwave.',
      ingredients: 'Organic steel-cut oats, organic dried apples, organic cinnamon, sea salt.',
      category: 'breakfast',
      tagSlugs: ['organic', 'high-fiber', 'heart-healthy'],
      image: IMG('photo-1517686469429-8bdb4b5f9074'),
      variants: [{ sku: 'HB-OAT-1', name: '12 oz', price: 549, compareAtPrice: 649, stock: 8, attributes: { size: '12 oz' } }],
      health: { servingSize: '½ cup dry', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 5, sugar: 6, sodium: 75, allergens: [] },
      rating: 4.7, reviewCount: 203, orderCount: 180,
    },
    {
      slug: 'extra-virgin-olive-oil-cold-pressed',
      name: 'Extra Virgin Olive Oil — Cold-Pressed',
      shortDescription: 'Single-origin Spanish EVOO. Cold-pressed, high in monounsaturated fats.',
      description: 'Harvested from Arbequina olives in Andalusia and cold-pressed within 24 hours of picking.',
      ingredients: '100% extra virgin olive oil.',
      category: 'pantry-staples',
      tagSlugs: ['organic', 'heart-healthy'],
      image: IMG('photo-1474979266404-7eaacbcd87c5'),
      variants: [
        { sku: 'HB-EVOO-250', name: '250ml', price: 899, stock: 40, attributes: { size: '250ml' } },
        { sku: 'HB-EVOO-500', name: '500ml', price: 1299, stock: 60, attributes: { size: '500ml' } },
        { sku: 'HB-EVOO-1L', name: '1L', price: 2199, stock: 25, attributes: { size: '1L' } },
        { sku: 'HB-EVOO-2L', name: '2L', price: 3899, stock: 12, attributes: { size: '2L' } },
      ],
      health: { servingSize: '1 tbsp', calories: 120, protein: 0, carbs: 0, fat: 14, sodium: 0, allergens: [] },
      rating: 4.8, reviewCount: 91, orderCount: 150,
    },
    {
      slug: 'kid-friendly-cheese-crackers-cheddar',
      name: 'Kid-Friendly Cheese Crackers — Cheddar',
      shortDescription: 'Baked cheddar crackers, no artificial dyes. Nut-free and lunchbox-ready.',
      description: 'The crunch kids want without the ingredient list you don\'t. Baked with real cheddar cheese.',
      ingredients: 'Enriched wheat flour, cheddar cheese, sunflower oil, sea salt, yeast.',
      category: 'snacks',
      tagSlugs: ['kid-friendly', 'nut-free', 'budget'],
      image: IMG('photo-1558961363-fa8fdf82db35'),
      variants: [{ sku: 'HB-CKR-1', name: '18 pouches', price: 399, compareAtPrice: 479, stock: 55, attributes: { size: '18-pack' } }],
      health: { servingSize: '1 pouch', calories: 130, protein: 3, carbs: 18, fat: 5, sodium: 190, allergens: ['wheat', 'milk'] },
      rating: 4.2, reviewCount: 156, orderCount: 220,
    },
    {
      slug: 'plant-protein-shake-vanilla-bean',
      name: 'Plant Protein Shake — Vanilla Bean',
      shortDescription: '25g plant protein from pea and rice. No dairy, no soy.',
      description: 'A creamy vanilla shake without the dairy. Shelf-stable and ready to drink.',
      ingredients: 'Water, pea protein isolate, rice protein, sunflower oil, monk fruit, natural vanilla, sea salt.',
      category: 'beverages',
      tagSlugs: ['high-protein', 'vegan', 'gluten-free'],
      image: IMG('photo-1622484219043-4c8d8c4c8c8c'),
      variants: [
        { sku: 'HB-SHK-VAN', name: 'Vanilla', price: 329, stock: 70, attributes: { flavor: 'Vanilla Bean' } },
        { sku: 'HB-SHK-CHO', name: 'Chocolate', price: 329, stock: 65, attributes: { flavor: 'Chocolate' } },
        { sku: 'HB-SHK-CB', name: 'Cold Brew', price: 349, stock: 40, attributes: { flavor: 'Cold Brew Coffee' } },
      ],
      health: { servingSize: '11 fl oz', calories: 160, protein: 25, carbs: 4, fat: 5, sugar: 2, allergens: [] },
      rating: 4.3, reviewCount: 84, orderCount: 175,
    },
    {
      slug: 'low-sodium-vegetable-soup-garden-harvest',
      name: 'Low-Sodium Vegetable Soup — Garden Harvest',
      shortDescription: '140mg sodium per cup—70% less than leading canned soups.',
      description: 'Garden vegetables in a light tomato broth, seasoned with herbs instead of salt.',
      ingredients: 'Water, carrots, celery, green beans, tomatoes, potato, onion, garlic, basil, oregano.',
      category: 'pantry-staples',
      tagSlugs: ['low-sodium', 'vegan', 'high-fiber'],
      image: IMG('photo-1547592160-23ac45744acd'),
      variants: [{ sku: 'HB-SOUP-1', name: '15 oz can', price: 449, stock: 80, attributes: { size: '15 oz' } }],
      health: { servingSize: '1 cup', calories: 80, protein: 2, carbs: 14, fat: 1, fiber: 4, sodium: 140, allergens: [] },
      rating: 4.5, reviewCount: 44, orderCount: 88,
    },
    {
      slug: 'budget-rice-bean-bowl-southwest',
      name: 'Budget Rice & Bean Bowl — Southwest',
      shortDescription: 'Microwave in 90 seconds. Brown rice, black beans, corn, and mild salsa.',
      description: 'Dorm-room and meal-prep friendly. High fiber, fully vegan, best price-per-serving deal.',
      ingredients: 'Brown rice, black beans, corn, water, tomato paste, onion, cumin, chili powder, sea salt.',
      category: 'prepared-meals',
      tagSlugs: ['budget', 'vegan', 'high-fiber', 'quick-prep'],
      image: IMG('photo-1512621776951-a57141f2eefd'),
      variants: [{ sku: 'HB-BWL-1', name: 'Single serve', price: 299, compareAtPrice: 399, stock: 100, attributes: { size: 'Single' } }],
      health: { servingSize: '1 bowl', calories: 320, protein: 9, carbs: 58, fat: 4, fiber: 8, allergens: [] },
      rating: 4.1, reviewCount: 312, orderCount: 400,
    },
    {
      slug: 'organic-cold-brew-coffee-unsweetened',
      name: 'Organic Cold Brew Coffee — Unsweetened',
      shortDescription: 'USDA Organic, zero sugar. 145mg caffeine per bottle.',
      description: 'Steeped 18 hours for a smooth, low-acid cup with no added sugar or dairy.',
      ingredients: 'Water, organic coffee.',
      category: 'beverages',
      tagSlugs: ['organic', 'low-sugar', 'vegan'],
      image: IMG('photo-1511927330031-f1f0e4cc8f2e'),
      variants: [{ sku: 'HB-CB-1', name: '10 fl oz', price: 499, stock: 45, attributes: { size: '10 fl oz' } }],
      health: { servingSize: '10 fl oz', calories: 5, protein: 0, carbs: 1, fat: 0, sugar: 0, allergens: [] },
      rating: 4.6, reviewCount: 77, orderCount: 120,
    },
    {
      slug: 'mixed-nut-trail-mix-lightly-salted',
      name: 'Mixed Nut Trail Mix — Lightly Salted',
      shortDescription: 'Almonds, cashews, and pepitas. 7g protein per ¼ cup.',
      description: 'Dry-roasted nuts and seeds with a touch of sea salt. Currently out of stock.',
      ingredients: 'Almonds, cashews, pumpkin seeds, sea salt.',
      category: 'snacks',
      tagSlugs: ['healthy', 'high-protein'],
      image: IMG('photo-1599599810769-39faba15c96a'),
      variants: [{ sku: 'HB-NUT-1', name: '8 oz', price: 899, stock: 0, attributes: { size: '8 oz' } }],
      health: { servingSize: '¼ cup', calories: 170, protein: 7, carbs: 6, fat: 14, sodium: 95, allergens: ['tree nuts'] },
      rating: 4.4, reviewCount: 58, orderCount: 42,
    },
  ];

  const productIds: Record<string, string> = {};

  for (const p of products) {
    const categorySlugs = [p.category, ...(p.extraCategories || [])];
    const tagNames = p.tagSlugs.map((slug) => tagData.find(([s]) => s === slug)?.[1] || slug);
    const categoryNames = categorySlugs.map((slug) => categories.find((c) => c.slug === slug)?.name || slug);
    const searchText = buildSearchText({
      name: p.name,
      description: p.description,
      shortDescription: p.shortDescription,
      ingredients: p.ingredients,
      tagNames,
      categoryNames,
    });

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        ingredients: p.ingredients,
        shortDescription: p.shortDescription,
        isPublished: true,
        isFeatured: p.isFeatured ?? false,
        averageRating: p.rating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        orderCount: p.orderCount ?? 0,
        searchText,
        categories: {
          create: categorySlugs.map((slug) => ({ categoryId: catMap[slug] })),
        },
        tags: { create: p.tagSlugs.map((slug) => ({ tagId: tags[slug].id })) },
        healthInfo: {
          create: {
            servingSize: p.health.servingSize,
            calories: p.health.calories,
            proteinGrams: p.health.protein,
            carbohydratesGrams: p.health.carbs,
            fatGrams: p.health.fat,
            fiberGrams: p.health.fiber,
            sugarGrams: p.health.sugar,
            sodiumMg: p.health.sodium,
            allergens: p.health.allergens,
          },
        },
        images: {
          create: [
            { url: p.image, altText: p.name, isPrimary: true, sortOrder: 0 },
            ...(p.extraImages || []).map((url, i) => ({
              url,
              altText: `${p.name} — image ${i + 2}`,
              isPrimary: false,
              sortOrder: i + 1,
            })),
          ],
        },
      },
    });

    productIds[p.slug] = product.id;

    const variants = [];
    for (const v of p.variants) {
      const variant = await prisma.variant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          stockQuantity: v.stock,
          lowStockThreshold: 5,
          attributes: v.attributes || {},
        },
      });
      variants.push(variant);
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { defaultVariantId: variants[0].id },
    });
  }

  // Sample delivered order for reviews + co-occurrence recommendations
  const yogurt = productIds['plain-greek-yogurt-2-percent'];
  const protein = productIds['vanilla-plant-protein-powder'];
  const granola = productIds['organic-almond-butter-granola-bar'];
  const bar = productIds['dark-chocolate-whey-protein-bar'];

  const yogurtVariant = await prisma.variant.findFirst({ where: { productId: yogurt } });
  const proteinVariant = await prisma.variant.findFirst({ where: { productId: protein } });
  const granolaVariant = await prisma.variant.findFirst({ where: { productId: granola } });
  const barVariant = await prisma.variant.findFirst({ where: { productId: bar } });

  if (yogurtVariant && proteinVariant && granolaVariant && barVariant) {
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-20260701-SEED',
        userId: customer.id,
        status: 'DELIVERED',
        subtotalAmount: 3499 + 599 + 349,
        shippingAmount: 0,
        totalAmount: 4447,
        shippingMethodId: shippingMethods[2].id,
        shippingMethodName: 'Free shipping',
        shippingAddress: { firstName: 'Maya', lastName: 'Chen', line1: '123 Green St', city: 'Portland', state: 'OR', postalCode: '97201', country: 'US' },
        deliveredAt: new Date(),
        items: {
          create: [
            { variantId: proteinVariant.id, productId: protein, productName: 'Vanilla Plant Protein Powder', variantName: '1 lb', sku: proteinVariant.sku, quantity: 1, unitPrice: 3499, lineTotal: 3499 },
            { variantId: yogurtVariant.id, productId: yogurt, productName: 'Plain Greek Yogurt', variantName: '16 oz', sku: yogurtVariant.sku, quantity: 1, unitPrice: 599, lineTotal: 599 },
            { variantId: granolaVariant.id, productId: granola, productName: 'Organic Almond Butter Granola Bar', variantName: 'Single bar', sku: granolaVariant.sku, quantity: 1, unitPrice: 349, lineTotal: 349 },
          ],
        },
        statusHistory: { create: [{ status: 'DELIVERED' }] },
        payment: { create: { provider: 'MOCK', amount: 4447, status: 'SUCCEEDED', providerPaymentId: 'mock_seed' } },
      },
    });

    await prisma.review.create({
      data: {
        productId: protein,
        userId: customer.id,
        orderId: order.id,
        rating: 5,
        title: 'Great with yogurt',
        body: 'Mixes smoothly and pairs perfectly with the Greek yogurt for breakfast.',
      },
    });

    // Second order for co-occurrence (protein + bar)
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-20260702-SEED',
        userId: customer.id,
        status: 'DELIVERED',
        subtotalAmount: 3499 + 299,
        shippingAmount: 599,
        totalAmount: 4397,
        shippingMethodId: shippingMethods[0].id,
        shippingMethodName: 'Standard',
        shippingAddress: { firstName: 'Maya', lastName: 'Chen', line1: '123 Green St', city: 'Portland', state: 'OR', postalCode: '97201', country: 'US' },
        deliveredAt: new Date(),
        items: {
          create: [
            { variantId: proteinVariant.id, productId: protein, productName: 'Vanilla Plant Protein Powder', variantName: '1 lb', sku: proteinVariant.sku, quantity: 1, unitPrice: 3499, lineTotal: 3499 },
            { variantId: barVariant.id, productId: bar, productName: 'Dark Chocolate Whey Protein Bar', variantName: 'Chocolate', sku: barVariant.sku, quantity: 1, unitPrice: 299, lineTotal: 299 },
          ],
        },
        statusHistory: { create: [{ status: 'DELIVERED' }] },
        payment: { create: { provider: 'MOCK', amount: 4397, status: 'SUCCEEDED' } },
      },
    });
  }

  console.log('Seed complete!');
  console.log('Admin: admin@harvestbasket.com (password from SEED_ADMIN_PASSWORD or admin12345 in dev)');
  console.log('Customer: customer@example.com / customer123');
  console.log('Promo codes: SAVE10 (10% off $20+), WELCOME5 ($5 off $15+)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
