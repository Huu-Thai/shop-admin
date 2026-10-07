import type { Metadata } from 'next';
import { ArticleEditor } from '@/features/content/article-editor';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { articleContext } from '@/server/content-context';

export const metadata: Metadata = { title: 'New post' };

export default async function NewPostPage() {
  const me = await requirePermission('cms:write');
  const ctx = await articleContext();
  return (
    <ArticleEditor
      kind="post"
      item={null}
      ctx={ctx}
      canWrite
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
