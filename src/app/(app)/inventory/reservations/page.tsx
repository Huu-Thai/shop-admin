import type { Metadata } from 'next';
import { ReservationsView } from '@/features/inventory/reservations-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getSources } from '@/server/catalog';

export const metadata: Metadata = { title: 'Reservations' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReservationsPage({
  searchParams,
}: PageProps<'/inventory/reservations'>) {
  const me = await requirePermission('inventory:read');
  const sp = await searchParams;
  const groupId = typeof sp.group === 'string' && UUID.test(sp.group) ? sp.group : '';
  let reservation = null;
  let notFound = false;
  if (groupId) {
    try {
      reservation = await call(
        adminApi().GET('/api/v1/admin/inventory/reservations/{groupId}', {
          params: { path: { groupId } },
        }),
      );
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) throw e;
      notFound = true;
    }
  }
  return (
    <ReservationsView
      groupId={groupId}
      reservation={reservation}
      notFound={notFound}
      sources={await getSources()}
      canWrite={hasPermission(me.permissions, 'inventory:write')}
    />
  );
}
