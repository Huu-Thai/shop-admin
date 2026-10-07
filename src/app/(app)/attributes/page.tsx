import type { Metadata } from 'next';
import { AttributesView } from '@/features/catalog/attributes/attributes-view';
import { hasPermission } from '@/lib/permissions';
import { requirePermission } from '@/server/auth';
import { getAttributes, getLocales } from '@/server/catalog';

export const metadata: Metadata = { title: 'Attributes' };

export default async function AttributesPage() {
  const me = await requirePermission('catalog:read');
  const [attributes, locales] = await Promise.all([getAttributes(), getLocales()]);
  return (
    <AttributesView
      attributes={attributes}
      locales={locales.map((l) => ({ code: l.code, name: l.name }))}
      canWrite={hasPermission(me.permissions, 'catalog:write')}
    />
  );
}
