import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ArticleEditor } from '@/features/content/article-editor';
import { pickLocalized } from '@/features/catalog/shared';
import { getLocale } from '@/i18n/server';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { articleContext, isUuid } from '@/server/content-context';

const getPost = cache(async (id: string) => {
  if (!isUuid(id)) notFound();
  try {
    return await call(adminApi().GET('/api/v1/admin/cms/posts/{id}', { params: { path: { id } } }));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/content/posts/[id]'>): Promise<Metadata> {
  const item = await getPost((await params).id);
  return { title: pickLocalized(item.translations, await getLocale())?.title || 'Post' };
}

export default async function PostPage({ params }: PageProps<'/content/posts/[id]'>) {
  const me = await requirePermission('cms:read');
  const [item, ctx] = await Promise.all([getPost((await params).id), articleContext()]);
  return (
    <ArticleEditor
      kind="post"
      item={item}
      ctx={ctx}
      canWrite={hasPermission(me.permissions, 'cms:write')}
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
