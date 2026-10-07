import type { Metadata } from 'next';
import { BlocksList } from '@/features/content/lists';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { contentContext, contentQuery } from '@/server/content-context';

export const metadata: Metadata = { title: 'Blocks' };

export default async function BlocksPage({ searchParams }: PageProps<'/content/blocks'>) {
  const me = await requirePermission('cms:read');
  const query = contentQuery(await searchParams);
  const [list, ctx] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/cms/blocks', { params: { query } })),
    contentContext(),
  ]);
  return (
    <BlocksList
      rows={list.data.map((b) => {
        const have = new Set(b.translations.filter((x) => x.content).map((x) => x.localeCode));
        return {
          id: b.id,
          href: `/content/blocks/${b.id}`,
          title: b.translations.find((x) => x.title)?.title ?? b.identifier,
          sub: b.identifier,
          missing: ctx.locales.map((l) => l.code).filter((c) => !have.has(c)),
          storeId: b.storeId,
          item: b,
          updatedAt: b.updatedAt,
        };
      })}
      total={list.total}
      page={query.page}
      limit={query.limit}
      stores={ctx.stores}
      canWrite={hasPermission(me.permissions, 'cms:write')}
    />
  );
}
