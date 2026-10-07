import type { Metadata } from 'next';
import { AuditView } from '@/features/system/audit-view';
import { ENTITY_TYPES } from '@/features/system/audit';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { isUuid } from '@/server/content-context';

export const metadata: Metadata = { title: 'Audit log' };

const LIMIT = 50;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function AuditPage({ searchParams }: PageProps<'/audit'>) {
  const me = await requirePermission('audit-logs:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const day = (v: unknown, end: boolean) =>
    typeof v === 'string' && DAY.test(v)
      ? new Date(`${v}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString()
      : undefined;
  const [list, users] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/audit-logs', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            entityType: ENTITY_TYPES.find((e) => e === sp.entityType),
            entityId: str(sp.entityId)?.slice(0, 64),
            actorId: isUuid(sp.actorId) ? sp.actorId : undefined,
            action: str(sp.action)?.slice(0, 100),
            from: day(sp.from, false),
            to: day(sp.to, true),
          },
        },
      }),
    ),
    hasPermission(me.permissions, 'admin-users:read')
      ? call(
          adminApi().GET('/api/v1/admin/users', {
            params: { query: { limit: 200, order: 'asc' } },
          }),
        )
          .then((r) =>
            r.data.map((u) => ({
              id: u.id,
              label: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
            })),
          )
          .catch(() => [])
      : [],
  ]);
  return (
    <AuditView
      entries={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      users={users}
      entityTypes={[...ENTITY_TYPES]}
      canExport={
        hasPermission(me.permissions, 'jobs:write') &&
        hasPermission(me.permissions, 'audit-logs:read')
      }
    />
  );
}
