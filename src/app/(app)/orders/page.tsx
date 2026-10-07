import type { Metadata } from 'next';
import { OrdersList } from '@/features/orders/orders-list';
import { FULFILLMENT_STATUSES, ORDER_STATUSES, PAYMENT_STATUSES } from '@/features/orders/tones';
import { adminApi, call, type Schemas } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getStores } from '@/server/catalog';

export const metadata: Metadata = { title: 'Orders' };

const LIMIT = 25;
const DAYS: Record<string, number> = { today: 0, '7d': 6, '30d': 29, '90d': 89 };
const uuid = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);
const pick = <T extends string>(v: unknown, list: readonly string[]) =>
  list.includes(v as string) ? (v as T) : undefined;

export default async function OrdersPage({ searchParams }: PageProps<'/orders'>) {
  await requirePermission('orders:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const period = typeof sp.period === 'string' && sp.period in DAYS ? DAYS[sp.period] : undefined;
  // Calendar days in UTC, like the dashboard report.
  const placedFrom =
    period === undefined
      ? undefined
      : new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate() - period,
          ),
        ).toISOString();
  const [list, stores] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/orders', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            search:
              typeof sp.search === 'string' && sp.search ? sp.search.slice(0, 100) : undefined,
            status: pick<Schemas['OrderStatus']>(sp.status, ORDER_STATUSES),
            paymentStatus: pick<Schemas['OrderPaymentStatus']>(sp.paymentStatus, PAYMENT_STATUSES),
            fulfillmentStatus: pick<Schemas['OrderFulfillmentStatus']>(
              sp.fulfillmentStatus,
              FULFILLMENT_STATUSES,
            ),
            storeId: uuid(sp.storeId),
            placedFrom,
            customerId: uuid(sp.customerId),
          },
        },
      }),
    ),
    getStores(),
  ]);
  return (
    <OrdersList orders={list.data} total={list.total} page={page} limit={LIMIT} stores={stores} />
  );
}
