import type { Metadata } from 'next';
import { CustomersList } from '@/features/customers/customers-list';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getCustomerGroups, getLocales, getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Customers' };

const LIMIT = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CustomersPage({ searchParams }: PageProps<'/customers'>) {
  const me = await requirePermission('customers:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const [list, groups, websites, locales] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/customers', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            search: str(sp.search)?.slice(0, 100),
            status: sp.status === 'ACTIVE' || sp.status === 'DISABLED' ? sp.status : undefined,
            groupCode: str(sp.group)?.slice(0, 64),
            websiteId:
              str(sp.websiteId) && UUID.test(sp.websiteId as string)
                ? (sp.websiteId as string)
                : undefined,
          },
        },
      }),
    ),
    getCustomerGroups(),
    getWebsites(),
    getLocales(),
  ]);
  return (
    <CustomersList
      customers={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      groups={groups}
      websites={websites}
      locales={locales.filter((l) => l.isActive)}
      canWrite={hasPermission(me.permissions, 'customers:write')}
    />
  );
}
