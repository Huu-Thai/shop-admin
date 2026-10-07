import type { Metadata } from 'next';
import { AccountsList } from '@/features/loyalty/accounts-list';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Loyalty members' };

const LIMIT = 25;

export default async function LoyaltyAccountsPage({
  searchParams,
}: PageProps<'/loyalty/accounts'>) {
  await requirePermission('customers:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const websiteId = str(sp.websiteId);
  const [list, programs, websites] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/loyalty/accounts', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            search: str(sp.search)?.slice(0, 100),
            websiteId: websiteId && /^[0-9a-f-]{36}$/i.test(websiteId) ? websiteId : undefined,
            tierCode: str(sp.tier)?.slice(0, 64),
          },
        },
      }),
    ),
    call(adminApi().GET('/api/v1/admin/loyalty/programs')),
    getWebsites(),
  ]);
  return (
    <AccountsList
      accounts={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      programs={programs}
      websites={websites}
    />
  );
}
