import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { CampaignDetail } from '@/features/marketing/campaign-detail';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getSellingCurrencies } from '@/server/marketing-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getCampaign = cache(async (id: string) => {
  if (!UUID.test(id)) notFound();
  try {
    return await call(
      adminApi().GET('/api/v1/admin/marketing/campaigns/{id}', { params: { path: { id } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/promotions/campaigns/[id]'>): Promise<Metadata> {
  return { title: (await getCampaign((await params).id)).name };
}

export default async function CampaignPage({ params }: PageProps<'/promotions/campaigns/[id]'>) {
  const me = await requirePermission('marketing:read');
  const { id } = await params;
  const [campaign, promotions, currencies] = await Promise.all([
    getCampaign(id),
    call(
      adminApi().GET('/api/v1/admin/marketing/promotions', {
        params: { query: { campaignId: id, limit: 200, order: 'asc' } },
      }),
    ),
    getSellingCurrencies(),
  ]);
  return (
    <CampaignDetail
      campaign={campaign}
      promotions={promotions.data}
      currencies={currencies}
      canWrite={hasPermission(me.permissions, 'marketing:write')}
    />
  );
}
