import type { Metadata } from 'next';
import { WebhooksView } from '@/features/payments/webhooks-view';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';

export const metadata: Metadata = { title: 'Payment webhooks' };

const LIMIT = 50;

export default async function PaymentWebhooksPage({
  searchParams,
}: PageProps<'/payments/webhooks'>) {
  await requirePermission('orders:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = (['PROCESSED', 'IGNORED', 'FAILED'] as const).find((s) => s === sp.status);
  const providerId =
    typeof sp.providerId === 'string' && /^[0-9a-f-]{36}$/i.test(sp.providerId)
      ? sp.providerId
      : undefined;
  const [list, providers] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/payment-webhooks', {
        params: { query: { page, limit: LIMIT, order: 'desc', status, providerId } },
      }),
    ),
    call(adminApi().GET('/api/v1/admin/payment-providers')),
  ]);
  return (
    <WebhooksView
      events={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      providers={providers}
    />
  );
}
