import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { BannerEditor } from '@/features/merchandising/banner-editor';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { contentContext, isUuid } from '@/server/content-context';

const getBanner = cache(async (id: string) => {
  if (!isUuid(id)) notFound();
  try {
    return await call(
      adminApi().GET('/api/v1/admin/merchandising/banners/{id}', { params: { path: { id } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/merchandising/[id]'>): Promise<Metadata> {
  return { title: (await getBanner((await params).id)).name };
}

export default async function BannerPage({ params }: PageProps<'/merchandising/[id]'>) {
  const me = await requirePermission('cms:read');
  const [banner, ctx] = await Promise.all([getBanner((await params).id), contentContext()]);
  return (
    <BannerEditor
      banner={banner}
      locales={ctx.locales}
      stores={ctx.stores}
      canWrite={hasPermission(me.permissions, 'cms:write')}
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
