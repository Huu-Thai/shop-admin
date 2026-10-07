import type { Metadata } from 'next';
import { MovementsView } from '@/features/inventory/movements-view';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getSources } from '@/server/catalog';

export const metadata: Metadata = { title: 'Stock movements' };

const LIMIT = 50;

export default async function MovementsPage({ searchParams }: PageProps<'/inventory/movements'>) {
  await requirePermission('inventory:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sourceId =
    typeof sp.sourceId === 'string' && /^[0-9a-f-]{36}$/i.test(sp.sourceId)
      ? sp.sourceId
      : undefined;
  const [list, sources] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/inventory/movements', {
        params: { query: { page, limit: LIMIT, order: 'desc', sourceId } },
      }),
    ),
    getSources(),
  ]);
  return (
    <MovementsView
      rows={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      sources={sources}
    />
  );
}
