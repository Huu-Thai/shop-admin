import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderDetail } from '@/features/orders/order-detail';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getStores } from '@/server/catalog';

export const metadata: Metadata = { title: 'Order' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({ params }: PageProps<'/orders/[id]'>) {
  const me = await requirePermission('orders:read');
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const path = { params: { path: { id } } };
  let order;
  try {
    order = await call(adminApi().GET('/api/v1/admin/orders/{id}', path));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [payments, stores, methods] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/orders/{id}/payments', path)),
    getStores(),
    call(adminApi().GET('/api/v1/admin/shipping-methods')).catch(() => []),
  ]);
  return (
    <OrderDetail
      order={order}
      payments={payments}
      storeName={stores.find((s) => s.id === order.storeId)?.name ?? ''}
      carriers={[...new Set(methods.map((m) => m.carrier))]}
      canWrite={hasPermission(me.permissions, 'orders:write')}
    />
  );
}
