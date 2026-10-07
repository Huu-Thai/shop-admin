'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });
const menuPaths = (id?: string) => ['/content/menus', ...(id ? [`/content/menus/${id}`] : [])];

export async function createMenu(body: Schemas['CreateMenuDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/navigation/menus', { body })),
    menuPaths(),
  );
}
export async function updateMenu(id: string, body: Schemas['UpdateMenuDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/navigation/menus/{id}', { ...one(id), body })),
    menuPaths(id),
  );
}
export async function deleteMenu(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/navigation/menus/{id}', one(id)));
    return null;
  }, menuPaths());
}
export async function createMenuItem(menuId: string, body: Schemas['CreateMenuItemDto']) {
  return attempt(
    () =>
      call(adminApi().POST('/api/v1/admin/navigation/menus/{id}/items', { ...one(menuId), body })),
    menuPaths(menuId),
  );
}
export async function updateMenuItem(
  menuId: string,
  id: string,
  body: Schemas['UpdateMenuItemDto'],
) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/navigation/menu-items/{id}', { ...one(id), body })),
    menuPaths(menuId),
  );
}
/** Moves several items at once (reorder): positions and parents, one request each. */
export async function moveMenuItems(
  menuId: string,
  moves: { id: string; parentId: string | null; position: number }[],
) {
  return attempt(async () => {
    for (const m of moves)
      await call(
        adminApi().PATCH('/api/v1/admin/navigation/menu-items/{id}', {
          ...one(m.id),
          body: { parentId: m.parentId, position: m.position },
        }),
      );
    return null;
  }, menuPaths(menuId));
}
export async function deleteMenuItem(menuId: string, id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/navigation/menu-items/{id}', one(id)));
    return null;
  }, menuPaths(menuId));
}

// ─── URL rewrites ───

export async function createRedirect(body: Schemas['CreateRedirectDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/url-rewrites', { body })),
    ['/content/redirects'],
  );
}
export async function deleteRewrite(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/url-rewrites/{id}', one(id)));
    return null;
  }, ['/content/redirects']);
}
export async function rebuildRewrites(storeId?: string) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/url-rewrites/rebuild', {
          body: storeId ? { storeId } : {},
        }),
      ),
    ['/content/redirects'],
  );
}
