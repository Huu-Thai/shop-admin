import type { Metadata } from 'next';
import { LoyaltyView } from '@/features/loyalty/loyalty-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getStores, getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Loyalty' };

export default async function LoyaltyPage() {
  const me = await requirePermission('customers:read');
  const [websites, stores, programs] = await Promise.all([
    getWebsites(),
    getStores(),
    call(adminApi().GET('/api/v1/admin/loyalty/programs')),
  ]);
  const currencies = Object.fromEntries(
    websites.map((w) => [
      w.id,
      [
        ...new Set([
          w.baseCurrencyCode,
          ...stores.filter((s) => s.websiteId === w.id).flatMap((s) => s.currencyCodes),
        ]),
      ],
    ]),
  );
  return (
    <LoyaltyView
      websites={websites}
      programs={programs}
      currencies={currencies}
      canWrite={hasPermission(me.permissions, 'customers:write')}
    />
  );
}
