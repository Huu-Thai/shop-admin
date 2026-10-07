import type { Metadata } from 'next';
import { PromotionsList } from '@/features/marketing/promotions-list';
import { CONTENT_STATUSES } from '@/features/marketing/tabs';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Promotions' };

const LIMIT = 25;
const uuid = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

export default async function PromotionsPage({ searchParams }: PageProps<'/promotions'>) {
  const me = await requirePermission('marketing:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [list, campaigns, websites] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/marketing/promotions', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            status: CONTENT_STATUSES.find((s) => s === sp.status),
            search:
              typeof sp.search === 'string' && sp.search ? sp.search.slice(0, 100) : undefined,
            campaignId: uuid(sp.campaignId),
            websiteId: uuid(sp.websiteId),
          },
        },
      }),
    ),
    call(
      adminApi().GET('/api/v1/admin/marketing/campaigns', {
        params: { query: { limit: 200, order: 'desc' } },
      }),
    ),
    getWebsites(),
  ]);
  return (
    <PromotionsList
      promotions={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      campaigns={campaigns.data}
      websites={websites}
      canWrite={hasPermission(me.permissions, 'marketing:write')}
    />
  );
}
