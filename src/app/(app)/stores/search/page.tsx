import type { Metadata } from 'next';
import { SearchView } from '@/features/stores/search-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchSettingsPage() {
  const me = await requirePermission('catalog:read');
  const websites = await getWebsites();
  const items = await Promise.all(
    websites.map(async (website) => ({
      website,
      status: await call(
        adminApi().GET('/api/v1/admin/search/websites/{websiteId}', {
          params: { path: { websiteId: website.id } },
        }),
      ),
    })),
  );
  return (
    <SearchView
      items={items}
      canConfigure={hasPermission(me.permissions, 'settings:write')}
      canReindex={hasPermission(me.permissions, 'catalog:write')}
    />
  );
}
