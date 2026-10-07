import type { Metadata } from 'next';
import { StockView } from '@/features/inventory/stock-view';
import { getLocale } from '@/i18n/server';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getLocales, getSources } from '@/server/catalog';

export const metadata: Metadata = { title: 'Stock' };

const LIMIT = 50;

export default async function StockPage({ searchParams }: PageProps<'/inventory'>) {
  const me = await requirePermission('inventory:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [list, sources, locales, adminLocale] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/inventory/stock', {
        params: {
          query: {
            page,
            limit: LIMIT,
            search: typeof sp.search === 'string' && sp.search ? sp.search.slice(0, 64) : undefined,
            sourceId:
              typeof sp.sourceId === 'string' && /^[0-9a-f-]{36}$/i.test(sp.sourceId)
                ? sp.sourceId
                : undefined,
          },
        },
      }),
    ),
    getSources(),
    getLocales(),
    getLocale(),
  ]);
  return (
    <StockView
      rows={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      sources={sources}
      nameLocale={locales.find((l) => l.code.startsWith(adminLocale))?.code ?? locales[0]?.code}
      canWrite={hasPermission(me.permissions, 'inventory:write')}
    />
  );
}
