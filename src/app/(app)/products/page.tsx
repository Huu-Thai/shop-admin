import type { Metadata } from 'next';
import { ProductsList } from '@/features/catalog/products/products-list';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call, type Schemas } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getAttributeSets, getCategoryTree, getLocales, getWebsites } from '@/server/catalog';
import { getLocale } from '@/i18n/server';

export const metadata: Metadata = { title: 'Products' };

const LIMIT = 25;

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]) =>
  allowed.includes(v as T) ? (v as T) : undefined;

export default async function ProductsPage({ searchParams }: PageProps<'/products'>) {
  const me = await requirePermission('catalog:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const adminLocale = await getLocale();
  const [sets, tree, websites, locales] = await Promise.all([
    getAttributeSets(),
    getCategoryTree(),
    getWebsites(),
    getLocales(),
  ]);
  // Product names in the store language closest to the admin's language.
  const nameLocale =
    locales.find((l) => l.code.toLowerCase().startsWith(adminLocale))?.code ?? locales[0]?.code;
  const sort = oneOf(sp.sort, ['sku', 'createdAt'] as const) ?? 'updatedAt';
  const list: Schemas['ProductListDto'] = await call(
    adminApi().GET('/api/v1/admin/products', {
      params: {
        query: {
          page,
          limit: LIMIT,
          sort,
          order: sort === 'sku' ? 'asc' : 'desc',
          search: str(sp.search)?.slice(0, 100),
          type: oneOf(sp.type, [
            'SIMPLE',
            'CONFIGURABLE',
            'BUNDLE',
            'VIRTUAL',
            'GIFT_CARD',
          ] as const),
          status: oneOf(sp.status, ['ENABLED', 'DISABLED'] as const),
          attributeSetId: str(sp.attributeSetId),
          categoryId: str(sp.categoryId),
          websiteId: str(sp.websiteId),
          locale: nameLocale,
          includeDeleted: sp.includeDeleted === 'true' ? true : undefined,
        },
      },
    }),
  );
  return (
    <ProductsList
      items={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      sets={sets}
      tree={tree}
      websites={websites}
      canWrite={hasPermission(me.permissions, 'catalog:write')}
    />
  );
}
