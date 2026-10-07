import type { Metadata } from 'next';
import { BlockEditor } from '@/features/content/block-editor';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { blockContext } from '@/server/content-context';

export const metadata: Metadata = { title: 'New block' };

export default async function NewBlockPage() {
  const me = await requirePermission('cms:write');
  return (
    <BlockEditor
      block={null}
      placements={[]}
      targetLabels={{}}
      ctx={await blockContext()}
      canWrite
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
