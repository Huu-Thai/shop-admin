import type { Metadata } from 'next';
import { ShippingView } from '@/features/shipping/shipping-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getLocales, getStores, getTaxClasses, getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Shipping methods' };

export default async function ShippingPage() {
  const me = await requirePermission('orders:read');
  const [methods, websites, stores, locales, taxClasses] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/shipping-methods')),
    getWebsites(),
    getStores(),
    getLocales(),
    getTaxClasses(),
  ]);
  return (
    <ShippingView
      methods={methods}
      websites={websites}
      stores={stores}
      locales={locales.map((l) => ({ code: l.code, name: l.name }))}
      taxClasses={taxClasses}
      canWrite={hasPermission(me.permissions, 'orders:write')}
    />
  );
}
