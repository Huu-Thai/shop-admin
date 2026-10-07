import type { Metadata } from 'next';
import { MediaLibrary } from '@/features/catalog/media/media-library';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getLocales } from '@/server/catalog';

export const metadata: Metadata = { title: 'Media' };

const LIMIT = 36;

export default async function MediaPage({ searchParams }: PageProps<'/media'>) {
  const me = await requirePermission('catalog:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const search = typeof sp.search === 'string' ? sp.search.slice(0, 100) : undefined;
  const [list, locales] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/images', {
        params: { query: { page, limit: LIMIT, order: 'desc', search } },
      }),
    ),
    getLocales(),
  ]);
  return (
    <MediaLibrary
      images={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      locales={locales.map((l) => ({ code: l.code, name: l.name }))}
      canWrite={hasPermission(me.permissions, 'catalog:write')}
    />
  );
}
