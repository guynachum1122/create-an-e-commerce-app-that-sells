import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/constants';

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const allowAi = process.env.ALLOW_AI_CRAWLERS === 'true';

  if (!isProduction) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  const rules: MetadataRoute.Robots['rules'] = [
    {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/account/', '/cart', '/checkout/', '/login', '/register', '/forgot-password', '/reset-password/', '/search?*'],
    },
    { userAgent: '*', allow: '/search?tags=' },
  ];

  if (!allowAi) {
    rules.push({ userAgent: 'GPTBot', disallow: '/' });
  }

  return {
    rules,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
