import type { Metadata } from 'next';
import { PaymentsView } from '@/features/payments/payments-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getLocales, getStores } from '@/server/catalog';

export const metadata: Metadata = { title: 'Payments' };

export default async function PaymentsPage() {
  const me = await requirePermission('orders:read');
  const [providers, methods, stores, locales] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/payment-providers')),
    call(adminApi().GET('/api/v1/admin/payment-methods')),
    getStores(),
    getLocales(),
  ]);
  return (
    <PaymentsView
      providers={providers}
      methods={methods}
      stores={stores}
      locales={locales.map((l) => ({ code: l.code, name: l.name }))}
      canWrite={hasPermission(me.permissions, 'settings:write')}
      canReconcile={hasPermission(me.permissions, 'orders:write')}
    />
  );
}
