import type { Metadata } from 'next';
import { MenusView } from '@/features/navigation/menus-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getStores } from '@/server/catalog';

export const metadata: Metadata = { title: 'Menus' };

export default async function MenusPage() {
  const me = await requirePermission('cms:read');
  const [menus, stores] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/navigation/menus')),
    getStores(),
  ]);
  return (
    <MenusView
      menus={[...menus].sort((a, b) => a.name.localeCompare(b.name))}
      stores={stores}
      canWrite={hasPermission(me.permissions, 'cms:write')}
    />
  );
}
