import type { Metadata } from 'next';
import { ApiKeysView } from '@/features/access/api-keys-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';

export const metadata: Metadata = { title: 'API keys' };

export default async function ApiKeysPage({ searchParams }: PageProps<'/users/api-keys'>) {
  const me = await requirePermission('api-keys:read');
  const { revoked } = await searchParams;
  const [keys, permissions] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/api-keys', {
        params: { query: { includeRevoked: revoked === '1' } },
      }),
    ),
    // The catalogue needs roles:read; without it the key form can only offer what is visible.
    hasPermission(me.permissions, 'roles:read')
      ? call(adminApi().GET('/api/v1/admin/permissions'))
      : [],
  ]);
  return (
    <ApiKeysView
      keys={keys}
      permissions={permissions}
      granted={me.permissions}
      canWrite={hasPermission(me.permissions, 'api-keys:write')}
    />
  );
}
