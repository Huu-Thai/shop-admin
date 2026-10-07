import type { Metadata } from 'next';
import { ArticleEditor } from '@/features/content/article-editor';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { articleContext } from '@/server/content-context';

export const metadata: Metadata = { title: 'New page' };

export default async function NewPagePage() {
  const me = await requirePermission('cms:write');
  const ctx = await articleContext();
  return (
    <ArticleEditor
      kind="page"
      item={null}
      ctx={ctx}
      canWrite
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
