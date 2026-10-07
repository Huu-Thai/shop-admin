import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { BlockEditor } from '@/features/content/block-editor';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { blockContext, isUuid, placementLabels } from '@/server/content-context';

const getBlock = cache(async (id: string) => {
  if (!isUuid(id)) notFound();
  try {
    return await call(
      adminApi().GET('/api/v1/admin/cms/blocks/{id}', { params: { path: { id } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/content/blocks/[id]'>): Promise<Metadata> {
  return { title: (await getBlock((await params).id)).identifier };
}

export default async function BlockPage({ params }: PageProps<'/content/blocks/[id]'>) {
  const me = await requirePermission('cms:read');
  const { id } = await params;
  const [block, placements, ctx] = await Promise.all([
    getBlock(id),
    call(adminApi().GET('/api/v1/admin/cms/blocks/{id}/placements', { params: { path: { id } } })),
    blockContext(),
  ]);
  return (
    <BlockEditor
      block={block}
      placements={placements}
      targetLabels={await placementLabels(placements, ctx)}
      ctx={ctx}
      canWrite={hasPermission(me.permissions, 'cms:write')}
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
