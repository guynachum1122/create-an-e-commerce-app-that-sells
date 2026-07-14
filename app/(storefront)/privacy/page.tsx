import { buildPrivacyMetadata } from '@/lib/seo/metadata';

export const metadata = buildPrivacyMetadata();

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 lg:px-8">
      <h1 className="font-display text-4xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-muted-foreground">Last updated: July 14, 2026</p>

      <div className="prose prose-stone mt-8 dark:prose-invert">
        <h2>1. Data we collect</h2>
        <p>We collect account information (name, email), order and shipping details, and usage data when you consent to analytics cookies.</p>

        <h2>2. How we use data</h2>
        <p>We use your data to fulfill orders, provide customer support, improve our store, and send transactional emails.</p>

        <h2>3. Cookies</h2>
        <p>Essential cookies power cart, checkout, and authentication. Analytics cookies (PostHog, Mixpanel) load only with your consent.</p>

        <h2>4. Third parties</h2>
        <p>We use payment processors (mock at launch), email delivery (Resend), OAuth (Google), and observability tools (Sentry, Vercel Analytics).</p>

        <h2>5. Retention</h2>
        <p>Order records are retained for legal and tax compliance. You may request account deletion from your profile settings.</p>

        <h2>6. Your rights (GDPR/CCPA)</h2>
        <p>You may access, correct, or delete your personal data. Contact us at privacy@harvestbasket.com.</p>

        <h2>7. Contact</h2>
        <p>Questions? Email privacy@harvestbasket.com</p>
      </div>
    </div>
  );
}
