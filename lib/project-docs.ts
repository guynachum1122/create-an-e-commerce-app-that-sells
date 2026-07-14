/** Placeholder — injected by upstream agents. Do not edit manually. */
export const PROJECT_DOCS_META = {
  prompt:
    'create an e-commerce app that sells food with categories, health info, tags, discounts, cart, payment, email orders, auth, and recommendations',
  domain: 'ecommerce',
  generatedAt: '2026-07-14T00:00:00.000Z',
  version: '1.0.0',
};

export type DocSection = {
  id: string;
  title: string;
  icon: string;
  content: string;
};

export const PROJECT_DOCS: DocSection[] = [
  {
    id: 'overview',
    title: 'Project Overview',
    icon: '📋',
    content: `# Harvest Basket\n\nFood e-commerce MVP with nutrition transparency, mock payments, and full observability.\n\nSee upstream agent artifacts for complete specifications.`,
  },
  {
    id: 'architecture',
    title: 'Architecture',
    icon: '🏗️',
    content: `# Architecture\n\n- **Framework:** Next.js 15 App Router\n- **Database:** PostgreSQL + Prisma\n- **Auth:** NextAuth v5\n- **Payments:** Mock provider (Stripe-ready interface)\n- **Search:** PostgreSQL full-text search`,
  },
  {
    id: 'features',
    title: 'Features',
    icon: '✨',
    content: `# Features\n\n- Product catalog with variants, tags, health info\n- Cart, checkout, orders\n- Wishlist & reviews\n- Admin panel\n- Recommendations\n- GDPR cookie consent`,
  },
];
