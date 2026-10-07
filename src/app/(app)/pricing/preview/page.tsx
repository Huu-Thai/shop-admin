import type { Metadata } from 'next';
import { PreviewTool } from '@/features/pricing/preview-tool';
import { getLocale } from '@/i18n/server';
import { requirePermission } from '@/server/auth';
import { getCustomerGroups, getLocales, getStores } from '@/server/catalog';

export const metadata: Metadata = { title: 'Price preview' };

export default async function PreviewPage({ searchParams }: PageProps<'/pricing/preview'>) {
  await requirePermission('pricing:read');
  const [stores, groups, locales, adminLocale, sp] = await Promise.all([
    getStores(),
    getCustomerGroups(),
    getLocales(),
    getLocale(),
    searchParams,
  ]);
  const variant =
    typeof sp.variant === 'string' &&
    typeof sp.sku === 'string' &&
    /^[0-9a-f-]{36}$/i.test(sp.variant)
      ? { id: sp.variant, sku: sp.sku.slice(0, 64) }
      : undefined;
  return (
    <PreviewTool
      stores={stores.filter((s) => s.isActive)}
      groups={groups}
      nameLocale={locales.find((l) => l.code.startsWith(adminLocale))?.code ?? locales[0]?.code}
      initialVariant={variant}
    />
  );
}
