import type { Metadata } from 'next';
import { WebsitesView } from '@/features/stores/websites-view';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { getCurrencies, getAllLocales, getStores, getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Stores' };

export default async function StoresPage() {
  const me = await requirePermission('stores:read');
  const [websites, stores, locales, currencies] = await Promise.all([
    getWebsites(),
    getStores(),
    getAllLocales(),
    getCurrencies(),
  ]);
  return (
    <WebsitesView
      websites={websites}
      stores={stores}
      locales={locales}
      currencies={currencies}
      canWrite={hasPermission(me.permissions, 'stores:write')}
    />
  );
}
