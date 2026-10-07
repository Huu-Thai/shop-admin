import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { CustomerDetail, type CustomerLoyalty } from '@/features/customers/customer-detail';
import { fullName } from '@/features/customers/shared';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getCustomerGroups, getLocales, getWebsites } from '@/server/catalog';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getCustomer = cache(async (id: string) => {
  if (!UUID.test(id)) notFound();
  try {
    return await call(adminApi().GET('/api/v1/admin/customers/{id}', { params: { path: { id } } }));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

/** 404 → null, so optional panels don't fail the page. */
const orNull = async <T,>(p: Promise<T>): Promise<T | null> => {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
};

export async function generateMetadata({
  params,
}: PageProps<'/customers/[id]'>): Promise<Metadata> {
  const c = await getCustomer((await params).id);
  return { title: fullName(c) || c.email };
}

export default async function CustomerPage({ params }: PageProps<'/customers/[id]'>) {
  const me = await requirePermission('customers:read');
  const { id } = await params;
  const customer = await getCustomer(id);
  const canOrders = hasPermission(me.permissions, 'orders:read');
  const [groups, websites, locales, orders, program] = await Promise.all([
    getCustomerGroups(),
    getWebsites(),
    getLocales(),
    canOrders
      ? call(
          adminApi().GET('/api/v1/admin/orders', {
            params: { query: { customerId: id, limit: 5, order: 'desc' } },
          }),
        )
      : null,
    orNull(
      call(
        adminApi().GET('/api/v1/admin/loyalty/programs/{websiteId}', {
          params: { path: { websiteId: customer.websiteId } },
        }),
      ),
    ),
  ]);
  let loyalty: CustomerLoyalty | null = null;
  if (program) {
    const path = { params: { path: { customerId: id } } };
    const [account, transactions] = await Promise.all([
      orNull(call(adminApi().GET('/api/v1/admin/loyalty/customers/{customerId}', path))),
      call(
        adminApi().GET('/api/v1/admin/loyalty/customers/{customerId}/transactions', {
          params: { ...path.params, query: { limit: 10, order: 'desc' } },
        }),
      ),
    ]);
    loyalty = { program, account, transactions };
  }
  return (
    <CustomerDetail
      customer={customer}
      groups={groups}
      locales={locales.filter((l) => l.isActive || l.code === customer.localeCode)}
      websiteName={websites.find((w) => w.id === customer.websiteId)?.name ?? '—'}
      orders={orders}
      loyalty={loyalty}
      canWrite={hasPermission(me.permissions, 'customers:write')}
    />
  );
}
