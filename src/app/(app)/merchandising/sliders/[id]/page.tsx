import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { SliderDetail } from '@/features/merchandising/slider-detail';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { contentContext, isUuid } from '@/server/content-context';

const getSlider = cache(async (id: string) => {
  if (!isUuid(id)) notFound();
  try {
    return await call(
      adminApi().GET('/api/v1/admin/merchandising/sliders/{id}', { params: { path: { id } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/merchandising/sliders/[id]'>): Promise<Metadata> {
  return { title: (await getSlider((await params).id)).name };
}

export default async function SliderPage({ params }: PageProps<'/merchandising/sliders/[id]'>) {
  const me = await requirePermission('cms:read');
  const [slider, ctx] = await Promise.all([getSlider((await params).id), contentContext()]);
  return (
    <SliderDetail
      slider={slider}
      locales={ctx.locales}
      stores={ctx.stores}
      canWrite={hasPermission(me.permissions, 'cms:write')}
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
