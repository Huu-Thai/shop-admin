import type { Metadata } from 'next';
import { GroupsView } from '@/features/customers/groups-view';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { getCustomerGroups, getTaxClasses } from '@/server/catalog';

export const metadata: Metadata = { title: 'Customer groups' };

export default async function CustomerGroupsPage() {
  const me = await requirePermission('customers:read');
  const [groups, taxClasses] = await Promise.all([getCustomerGroups(), getTaxClasses()]);
  return (
    <GroupsView
      groups={groups}
      taxClasses={taxClasses}
      canWrite={hasPermission(me.permissions, 'customers:write')}
    />
  );
}
