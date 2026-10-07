import type { Metadata } from 'next';
import { SetsView } from '@/features/catalog/sets/sets-view';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { getAttributes, getAttributeSets } from '@/server/catalog';

export const metadata: Metadata = { title: 'Attribute sets' };

export default async function AttributeSetsPage() {
  const me = await requirePermission('catalog:read');
  const [sets, attributes] = await Promise.all([getAttributeSets(), getAttributes()]);
  return (
    <SetsView
      sets={sets}
      attributes={attributes}
      canWrite={hasPermission(me.permissions, 'catalog:write')}
    />
  );
}
