import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ZoneDetail } from '@/features/tax/zone-detail';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getTaxClasses, getTaxZones } from '@/server/catalog';

export const metadata: Metadata = { title: 'Tax zone' };

export default async function TaxZonePage({ params }: PageProps<'/tax/zones/[id]'>) {
  const me = await requirePermission('pricing:read');
  const { id } = await params;
  const [zones, classes] = await Promise.all([getTaxZones(), getTaxClasses()]);
  const zone = zones.find((z) => z.id === id);
  if (!zone) notFound();
  const rates = await call(
    adminApi().GET('/api/v1/admin/tax/rates', { params: { query: { zoneId: id } } }),
  );
  return (
    <ZoneDetail
      zone={zone}
      rates={rates}
      classes={classes}
      canWrite={hasPermission(me.permissions, 'pricing:write')}
    />
  );
}
