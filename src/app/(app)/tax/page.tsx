import type { Metadata } from 'next';
import { TaxOverview } from '@/features/tax/tax-overview';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getTaxClasses, getTaxZones } from '@/server/catalog';

export const metadata: Metadata = { title: 'Tax' };

export default async function TaxPage() {
  const me = await requirePermission('pricing:read');
  const [classes, zones, rates] = await Promise.all([
    getTaxClasses(),
    getTaxZones(),
    call(adminApi().GET('/api/v1/admin/tax/rates')),
  ]);
  const rateCounts: Record<string, number> = {};
  for (const r of rates) rateCounts[r.zoneId] = (rateCounts[r.zoneId] ?? 0) + 1;
  return (
    <TaxOverview
      classes={classes}
      zones={zones}
      rateCounts={rateCounts}
      canWrite={hasPermission(me.permissions, 'pricing:write')}
    />
  );
}
