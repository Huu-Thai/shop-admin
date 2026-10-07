import type { Metadata } from 'next';
import { PostsList } from '@/features/content/lists';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { contentContext, contentQuery, isUuid, titleOf } from '@/server/content-context';

export const metadata: Metadata = { title: 'Blog posts' };

export default async function PostsPage({ searchParams }: PageProps<'/content/posts'>) {
  const me = await requirePermission('cms:read');
  const sp = await searchParams;
  const query = contentQuery(sp);
  const [list, ctx, tags] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/cms/posts', {
        params: { query: { ...query, tagId: isUuid(sp.tagId) ? sp.tagId : undefined } },
      }),
    ),
    contentContext(),
    call(adminApi().GET('/api/v1/admin/cms/tags')),
  ]);
  return (
    <PostsList
      rows={list.data.map((p) => ({
        id: p.id,
        href: `/content/posts/${p.id}`,
        ...titleOf(p.translations, ctx.adminLocale, ctx.locales),
        sub: `/blog/${p.translations.find((x) => x.localeCode === ctx.locales[0]?.code)?.slug ?? p.translations[0]?.slug ?? ''}`,
        storeId: p.storeId,
        item: p,
        updatedAt: p.updatedAt,
      }))}
      total={list.total}
      page={query.page}
      limit={query.limit}
      stores={ctx.stores}
      tags={tags}
      locales={ctx.locales}
      canWrite={hasPermission(me.permissions, 'cms:write')}
    />
  );
}
