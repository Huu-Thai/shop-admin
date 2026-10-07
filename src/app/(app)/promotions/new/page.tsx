import type { Metadata } from 'next';
import { PromotionEditor } from '@/features/marketing/promotion-editor';
import { requirePermission } from '@/server/auth';
import { promotionEditorContext } from '@/server/marketing-context';

export const metadata: Metadata = { title: 'New promotion' };

export default async function NewPromotionPage({ searchParams }: PageProps<'/promotions/new'>) {
  await requirePermission('marketing:write');
  const { campaignId } = await searchParams;
  const ctx = await promotionEditorContext();
  const preset =
    typeof campaignId === 'string' && ctx.campaigns.some((c) => c.id === campaignId)
      ? campaignId
      : undefined;
  return <PromotionEditor promotion={null} ctx={ctx} campaignId={preset} canWrite />;
}
