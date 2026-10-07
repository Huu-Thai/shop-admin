import type { Metadata } from 'next';
import { PagesList } from '@/features/content/lists';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { contentContext, contentQuery, titleOf } from '@/server/content-context';

export const metadata: Metadata = { title: 'Pages' };

export default async function PagesPage({ searchParams }: PageProps<'/content'>) {
  const me = await requirePermission('cms:read');
  const query = contentQuery(await searchParams);
  const [list, ctx] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/cms/pages', { params: { query } })),
    contentContext(),
  ]);
  return (
    <PagesList
      rows={list.data.map((p) => ({
        id: p.id,
        href: `/content/pages/${p.id}`,
        ...titleOf(p.translations, ctx.adminLocale, ctx.locales),
        sub: `/${p.translations.find((x) => x.localeCode === ctx.locales[0]?.code)?.slug ?? p.translations[0]?.slug ?? ''}`,
        storeId: p.storeId,
        item: p,
        updatedAt: p.updatedAt,
      }))}
      total={list.total}
      page={query.page}
      limit={query.limit}
      stores={ctx.stores}
      canWrite={hasPermission(me.permissions, 'cms:write')}
    />
  );
}
