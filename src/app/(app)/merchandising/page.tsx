import type { Metadata } from 'next';
import { BannersList } from '@/features/merchandising/lists';
import { PLACEMENTS } from '@/features/content/tabs';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { contentContext, contentQuery } from '@/server/content-context';

export const metadata: Metadata = { title: 'Banners' };

export default async function BannersPage({ searchParams }: PageProps<'/merchandising'>) {
  const me = await requirePermission('cms:read');
  const sp = await searchParams;
  const query = contentQuery(sp);
  const placement =
    typeof sp.placement === 'string' && /^[a-z0-9._-]{1,64}$/.test(sp.placement)
      ? sp.placement
      : undefined;
  const [list, ctx] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/merchandising/banners', {
        params: { query: { ...query, placement } },
      }),
    ),
    contentContext(),
  ]);
  return (
    <BannersList
      rows={list.data.map((b) => ({
        id: b.id,
        href: `/merchandising/${b.id}`,
        title: b.name,
        sub: `${b.placement} · ${b.position}`,
        storeId: b.storeId,
        item: b,
        updatedAt: b.updatedAt,
      }))}
      total={list.total}
      page={query.page}
      limit={query.limit}
      stores={ctx.stores}
      placements={[...new Set([...PLACEMENTS, ...list.data.map((b) => b.placement)])].sort()}
      canWrite={hasPermission(me.permissions, 'cms:write')}
    />
  );
}
