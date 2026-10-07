import type { Metadata } from 'next';
import { SourcesView } from '@/features/inventory/sources-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getSources, getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Inventory sources' };

export default async function SourcesPage() {
  const me = await requirePermission('inventory:read');
  const [sources, websites] = await Promise.all([getSources(), getWebsites()]);
  const lists = await Promise.all(
    websites.map((w) =>
      call(
        adminApi().GET('/api/v1/admin/websites/{id}/inventory-sources', {
          params: { path: { id: w.id } },
        }),
      ),
    ),
  );
  const assignments = Object.fromEntries(
    websites.map((w, i) => [
      w.id,
      [...lists[i]].sort((a, b) => a.priority - b.priority).map((s) => s.sourceId),
    ]),
  );
  return (
    <SourcesView
      sources={sources}
      websites={websites}
      assignments={assignments}
      canWrite={hasPermission(me.permissions, 'inventory:write')}
    />
  );
}
