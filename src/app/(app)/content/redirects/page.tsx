import type { Metadata } from 'next';
import { TARGET_TYPES } from '@/features/content/tabs';
import { RedirectsView } from '@/features/navigation/redirects-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getStores } from '@/server/catalog';
import { isUuid } from '@/server/content-context';

export const metadata: Metadata = { title: 'URLs & redirects' };

const LIMIT = 50;

export default async function RedirectsPage({ searchParams }: PageProps<'/content/redirects'>) {
  const me = await requirePermission('catalog:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const [list, stores] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/url-rewrites', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            search: str(sp.search)?.slice(0, 200),
            storeId: isUuid(sp.storeId) ? sp.storeId : undefined,
            localeCode: str(sp.localeCode)?.slice(0, 16),
            targetType: TARGET_TYPES.find((x) => x === sp.targetType),
          },
        },
      }),
    ),
    getStores(),
  ]);
  return (
    <RedirectsView
      rewrites={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      stores={stores}
      canWrite={hasPermission(me.permissions, 'catalog:write')}
    />
  );
}
