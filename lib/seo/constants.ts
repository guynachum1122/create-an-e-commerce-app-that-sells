export const SITE_NAME = process.env.SITE_NAME || 'Harvest Basket';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const OG_DEFAULT_IMAGE = process.env.OG_DEFAULT_IMAGE_URL || `${SITE_URL}/og/default.png`;
export const TWITTER_HANDLE = process.env.TWITTER_HANDLE;

export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'cart', 'checkout', 'account', 'login', 'register',
  'search', 'privacy', 'products', 'category', 'docs',
]);
