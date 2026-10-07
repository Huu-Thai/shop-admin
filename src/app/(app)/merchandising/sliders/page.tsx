import type { Metadata } from 'next';
import { SlidersList } from '@/features/merchandising/lists';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { contentContext, contentQuery } from '@/server/content-context';
import { getT } from '@/i18n/server';

export const metadata: Metadata = { title: 'Sliders' };

export default async function SlidersPage({ searchParams }: PageProps<'/merchandising/sliders'>) {
  const me = await requirePermission('cms:read');
  const query = contentQuery(await searchParams);
  const [list, ctx, t] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/merchandising/sliders', { params: { query } })),
    contentContext(),
    getT(),
  ]);
  return (
    <SlidersList
      rows={list.data.map((s) => ({
        id: s.id,
        href: `/merchandising/sliders/${s.id}`,
        title: s.name,
        sub: `${s.code} · ${t('sld.count', { n: s.slides.length })}`,
        storeId: s.storeId,
        item: s,
        updatedAt: s.updatedAt,
      }))}
      total={list.total}
      page={query.page}
      limit={query.limit}
      stores={ctx.stores}
      canWrite={hasPermission(me.permissions, 'cms:write')}
    />
  );
}
