import { noIndexMetadata } from '@/lib/seo/metadata';

export const metadata = noIndexMetadata('Checkout');

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
