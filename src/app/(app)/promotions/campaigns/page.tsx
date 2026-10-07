import type { Metadata } from 'next';
import { CampaignsList } from '@/features/marketing/campaigns-list';
import { CONTENT_STATUSES } from '@/features/marketing/tabs';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getSellingCurrencies } from '@/server/marketing-context';

export const metadata: Metadata = { title: 'Campaigns' };

const LIMIT = 25;

export default async function CampaignsPage({ searchParams }: PageProps<'/promotions/campaigns'>) {
  const me = await requirePermission('marketing:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = CONTENT_STATUSES.find((s) => s === sp.status);
  const [list, currencies] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/marketing/campaigns', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            status,
            search:
              typeof sp.search === 'string' && sp.search ? sp.search.slice(0, 100) : undefined,
          },
        },
      }),
    ),
    getSellingCurrencies(),
  ]);
  return (
    <CampaignsList
      campaigns={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      currencies={currencies}
      canWrite={hasPermission(me.permissions, 'marketing:write')}
    />
  );
}
