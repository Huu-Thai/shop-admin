import type { Metadata } from 'next';
import { Simulator } from '@/features/marketing/simulator';
import { getLocale } from '@/i18n/server';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getCustomerGroups, getLocales, getStores, getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Promotion simulator' };

export default async function SimulatePage({ searchParams }: PageProps<'/promotions/simulate'>) {
  await requirePermission('marketing:read');
  const { websiteId } = await searchParams;
  const [websites, stores, groups, locales, adminLocale, promotions] = await Promise.all([
    getWebsites(),
    getStores(),
    getCustomerGroups(),
    getLocales(),
    getLocale(),
    call(
      adminApi().GET('/api/v1/admin/marketing/promotions', {
        params: { query: { limit: 200, order: 'desc' } },
      }),
    ),
  ]);
  const active = locales.filter((l) => l.isActive);
  return (
    <Simulator
      websites={websites.filter((w) => w.isActive)}
      stores={stores.filter((s) => s.isActive)}
      groups={groups}
      promotions={Object.fromEntries(promotions.data.map((p) => [p.id, p.name]))}
      initialWebsiteId={typeof websiteId === 'string' ? websiteId : undefined}
      nameLocale={
        active.find((l) => l.code.toLowerCase().startsWith(adminLocale))?.code ?? active[0]?.code
      }
    />
  );
}
