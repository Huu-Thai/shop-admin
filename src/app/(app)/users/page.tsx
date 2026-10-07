import type { Metadata } from 'next';
import { UsersView } from '@/features/access/users-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';

export const metadata: Metadata = { title: 'Admin users' };

const LIMIT = 25;

export default async function UsersPage({ searchParams }: PageProps<'/users'>) {
  const me = await requirePermission('admin-users:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [list, roles] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/users', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'asc',
            search:
              typeof sp.search === 'string' && sp.search ? sp.search.slice(0, 100) : undefined,
            status: sp.status === 'ACTIVE' || sp.status === 'DISABLED' ? sp.status : undefined,
          },
        },
      }),
    ),
    hasPermission(me.permissions, 'roles:read') ? call(adminApi().GET('/api/v1/admin/roles')) : [],
  ]);
  return (
    <UsersView
      users={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      roles={roles}
      meId={me.id}
      canWrite={hasPermission(me.permissions, 'admin-users:write')}
    />
  );
}
