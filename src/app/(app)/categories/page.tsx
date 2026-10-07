import type { Metadata } from 'next';
import { CategoriesView } from '@/features/catalog/categories/categories-view';
import { findNode } from '@/features/catalog/categories/tree';
import { fromLinks } from '@/features/catalog/media/links';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getCategoryTree, getLocales, getWebsites } from '@/server/catalog';

export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage({ searchParams }: PageProps<'/categories'>) {
  const me = await requirePermission('catalog:read');
  const sp = await searchParams;
  const [tree, locales, websites] = await Promise.all([
    getCategoryTree(),
    getLocales(),
    getWebsites(),
  ]);
  const id = typeof sp.id === 'string' ? sp.id : undefined;
  const selected = id ? (findNode(tree, id) ?? null) : null;
  const canWrite = hasPermission(me.permissions, 'catalog:write');
  const creating = canWrite && typeof sp.new === 'string' && !selected;
  const newParentId =
    creating && sp.new !== 'root' && findNode(tree, String(sp.new)) ? String(sp.new) : null;
  const links = selected
    ? await call(
        adminApi().GET('/api/v1/admin/categories/{id}/images', {
          params: { path: { id: selected.id } },
        }),
      )
    : [];
  return (
    <CategoriesView
      tree={tree}
      selected={selected}
      newParentId={newParentId}
      creating={creating}
      locales={locales.map((l) => ({ code: l.code, name: l.name }))}
      websites={websites}
      images={fromLinks(links)}
      canWrite={canWrite}
    />
  );
}
