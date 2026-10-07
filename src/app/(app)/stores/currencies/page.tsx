import type { Metadata } from 'next';
import { CurrenciesView } from '@/features/stores/locales-currencies';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { getCurrencies, getStores } from '@/server/catalog';

export const metadata: Metadata = { title: 'Currencies' };

export default async function CurrenciesPage() {
  const me = await requirePermission('stores:read');
  const [currencies, stores] = await Promise.all([getCurrencies(), getStores()]);
  const usedBy: Record<string, string[]> = {};
  for (const s of stores) for (const c of s.currencyCodes) (usedBy[c] ??= []).push(s.name);
  return (
    <CurrenciesView
      currencies={currencies}
      usedBy={usedBy}
      canWrite={hasPermission(me.permissions, 'stores:write')}
    />
  );
}
