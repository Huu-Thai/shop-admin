import type { Metadata } from 'next';
import { BooksView } from '@/features/pricing/books-view';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { getPriceBooks } from '@/server/catalog';
import { pricingRefs } from '@/server/pricing-context';

export const metadata: Metadata = { title: 'Price books' };

export default async function PricingPage() {
  const me = await requirePermission('pricing:read');
  const [books, refs] = await Promise.all([getPriceBooks(), pricingRefs()]);
  return (
    <BooksView
      books={books}
      refs={refs}
      canWrite={hasPermission(me.permissions, 'pricing:write')}
    />
  );
}
