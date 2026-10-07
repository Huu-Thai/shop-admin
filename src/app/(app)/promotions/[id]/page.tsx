import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PromotionEditor } from '@/features/marketing/promotion-editor';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { promotionEditorContext } from '@/server/marketing-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getPromotion = cache(async (id: string) => {
  if (!UUID.test(id)) notFound();
  try {
    return await call(
      adminApi().GET('/api/v1/admin/marketing/promotions/{id}', { params: { path: { id } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/promotions/[id]'>): Promise<Metadata> {
  return { title: (await getPromotion((await params).id)).name };
}

export default async function PromotionPage({ params }: PageProps<'/promotions/[id]'>) {
  const me = await requirePermission('marketing:read');
  const promotion = await getPromotion((await params).id);
  const productIds = [...promotion.conditions, ...promotion.actions].flatMap((r) =>
    'filter' in r && r.filter?.productIds ? r.filter.productIds : [],
  );
  const ctx = await promotionEditorContext(productIds);
  return (
    <PromotionEditor
      promotion={promotion}
      ctx={ctx}
      canWrite={hasPermission(me.permissions, 'marketing:write')}
    />
  );
}
