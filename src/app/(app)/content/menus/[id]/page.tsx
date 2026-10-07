import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { MenuEditor } from '@/features/navigation/menu-editor';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { blockContext, isUuid, placementLabels } from '@/server/content-context';

const getMenu = cache(async (id: string) => {
  if (!isUuid(id)) notFound();
  try {
    return await call(
      adminApi().GET('/api/v1/admin/navigation/menus/{id}', { params: { path: { id } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/content/menus/[id]'>): Promise<Metadata> {
  return { title: (await getMenu((await params).id)).name };
}

export default async function MenuPage({ params }: PageProps<'/content/menus/[id]'>) {
  const me = await requirePermission('cms:read');
  const [menu, ctx] = await Promise.all([getMenu((await params).id), blockContext()]);
  const targetLabels = await placementLabels(
    menu.items
      .filter((i) => i.targetId)
      .map((i) => ({ targetType: i.linkType, targetId: i.targetId! })),
    ctx,
  );
  return (
    <MenuEditor
      menu={menu}
      targetLabels={targetLabels}
      ctx={ctx}
      canWrite={hasPermission(me.permissions, 'cms:write')}
    />
  );
}
