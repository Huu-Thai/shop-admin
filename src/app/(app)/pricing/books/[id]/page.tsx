import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookDetail } from '@/features/pricing/book-detail';
import { getLocale } from '@/i18n/server';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getLocales } from '@/server/catalog';
import { pricingRefs } from '@/server/pricing-context';

export const metadata: Metadata = { title: 'Price book' };

const LIMIT = 100;
const UUID = /^[0-9a-f-]{36}$/i;

export default async function PriceBookPage({
  params,
  searchParams,
}: PageProps<'/pricing/books/[id]'>) {
  const me = await requirePermission('pricing:read');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const search = typeof sp.search === 'string' && sp.search ? sp.search.slice(0, 64) : undefined;
  let book;
  try {
    book = await call(
      adminApi().GET('/api/v1/admin/price-books/{id}', { params: { path: { id } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [list, refs, locales, adminLocale] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/price-books/{id}/entries', {
        params: { path: { id }, query: { page, limit: LIMIT, search } },
      }),
    ),
    pricingRefs(),
    getLocales(),
    getLocale(),
  ]);
  return (
    <BookDetail
      book={book}
      entries={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      refs={refs}
      nameLocale={locales.find((l) => l.code.startsWith(adminLocale))?.code ?? locales[0]?.code}
      canWrite={hasPermission(me.permissions, 'pricing:write')}
    />
  );
}
