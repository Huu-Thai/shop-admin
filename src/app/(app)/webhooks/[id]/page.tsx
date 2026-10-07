import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DELIVERY_STATUSES } from '@/features/webhooks/events';
import { WebhookDetail } from '@/features/webhooks/webhook-detail';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { isUuid } from '@/server/content-context';

export const metadata: Metadata = { title: 'Webhook' };

const LIMIT = 25;

export default async function WebhookPage({ params, searchParams }: PageProps<'/webhooks/[id]'>) {
  const me = await requirePermission('webhooks:read');
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const path = { params: { path: { id } } };
  let hook;
  try {
    hook = await call(adminApi().GET('/api/v1/admin/webhooks/{id}', path));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [events, deliveries] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/webhooks/events')),
    call(
      adminApi().GET('/api/v1/admin/webhooks/{id}/deliveries', {
        params: {
          path: { id },
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            status: DELIVERY_STATUSES.find((s) => s === sp.status),
          },
        },
      }),
    ),
  ]);
  return (
    <WebhookDetail
      hook={hook}
      events={events}
      deliveries={deliveries.data}
      total={deliveries.total}
      page={page}
      limit={LIMIT}
      canWrite={hasPermission(me.permissions, 'webhooks:write')}
    />
  );
}
