import type { Metadata } from 'next';
import { RolesView } from '@/features/access/roles-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';

export const metadata: Metadata = { title: 'Roles' };

export default async function RolesPage() {
  const me = await requirePermission('roles:read');
  const [roles, permissions] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/roles')),
    call(adminApi().GET('/api/v1/admin/permissions')),
  ]);
  return (
    <RolesView
      roles={roles}
      permissions={permissions}
      granted={me.permissions}
      canWrite={hasPermission(me.permissions, 'roles:write')}
    />
  );
}
