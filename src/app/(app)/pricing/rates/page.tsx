import type { Metadata } from 'next';
import { RatesView } from '@/features/pricing/rates-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getCurrencies } from '@/server/catalog';

export const metadata: Metadata = { title: 'Currencies & rates' };

export default async function RatesPage() {
  const me = await requirePermission('pricing:read');
  const [currencies, rates] = await Promise.all([
    getCurrencies(),
    call(adminApi().GET('/api/v1/admin/exchange-rates')),
  ]);
  return (
    <RatesView
      currencies={currencies}
      rates={rates}
      canWrite={hasPermission(me.permissions, 'pricing:write')}
      canWriteCurrencies={hasPermission(me.permissions, 'stores:write')}
    />
  );
}
