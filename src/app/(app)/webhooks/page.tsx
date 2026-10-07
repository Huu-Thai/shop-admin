import type { Metadata } from 'next';
import { WebhooksView } from '@/features/webhooks/webhooks-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';

export const metadata: Metadata = { title: 'Webhooks' };

export default async function WebhooksPage() {
  const me = await requirePermission('webhooks:read');
  const [hooks, events] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/webhooks')),
    call(adminApi().GET('/api/v1/admin/webhooks/events')),
  ]);
  return (
    <WebhooksView
      hooks={[...hooks].sort((a, b) => a.name.localeCompare(b.name))}
      events={events}
      canWrite={hasPermission(me.permissions, 'webhooks:write')}
    />
  );
}
