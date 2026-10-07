import type { Metadata } from 'next';
import { LocalesView } from '@/features/stores/locales-currencies';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { getAllLocales, getStores } from '@/server/catalog';

export const metadata: Metadata = { title: 'Languages' };

export default async function LocalesPage() {
  const me = await requirePermission('stores:read');
  const [locales, stores] = await Promise.all([getAllLocales(), getStores()]);
  const usedBy: Record<string, string[]> = {};
  for (const s of stores) for (const c of s.localeCodes) (usedBy[c] ??= []).push(s.name);
  return (
    <LocalesView
      locales={locales}
      usedBy={usedBy}
      canWrite={hasPermission(me.permissions, 'stores:write')}
    />
  );
}
