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

const getPage = cache(async (id: string) => {
  if (!isUuid(id)) notFound();
  try {
    return await call(adminApi().GET('/api/v1/admin/cms/pages/{id}', { params: { path: { id } } }));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/content/pages/[id]'>): Promise<Metadata> {
  const item = await getPage((await params).id);
  return { title: pickLocalized(item.translations, await getLocale())?.title || 'Page' };
}

export default async function PagePage({ params }: PageProps<'/content/pages/[id]'>) {
  const me = await requirePermission('cms:read');
  const [item, ctx] = await Promise.all([getPage((await params).id), articleContext()]);
  return (
    <ArticleEditor
      kind="page"
      item={item}
      ctx={ctx}
      canWrite={hasPermission(me.permissions, 'cms:write')}
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
