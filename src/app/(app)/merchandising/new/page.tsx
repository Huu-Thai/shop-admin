import type { Metadata } from 'next';
import { BannerEditor } from '@/features/merchandising/banner-editor';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { contentContext } from '@/server/content-context';

export const metadata: Metadata = { title: 'New banner' };

export default async function NewBannerPage() {
  const me = await requirePermission('cms:write');
  const ctx = await contentContext();
  return (
    <BannerEditor
      banner={null}
      locales={ctx.locales}
      stores={ctx.stores}
      canWrite
      canPublish={hasPermission(me.permissions, 'cms:publish')}
    />
  );
}
