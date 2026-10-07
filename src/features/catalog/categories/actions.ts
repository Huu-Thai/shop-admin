'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/categories', '/products'];

export async function createCategory(body: Schemas['CreateCategoryDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/categories', { body })), paths);
}

export async function updateCategory(id: string, body: Schemas['UpdateCategoryDto']) {
  return attempt(
    () =>
      call(adminApi().PATCH('/api/v1/admin/categories/{id}', { params: { path: { id } }, body })),
    paths,
  );
}

/** Moves under `parentId` (null = root) at `position` among the new siblings. */
export async function moveCategory(id: string, parentId: string | null, position: number) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/categories/{id}/move', {
          params: { path: { id } },
          body: { parentId, position },
        }),
      ),
    paths,
  );
}

export async function deleteCategory(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/categories/{id}', { params: { path: { id } } }));
    return null;
  }, paths);
}

export async function setCategoryImages(id: string, images: Schemas['ImageLinkInputDto'][]) {
  return attempt(
    () =>
      call(
        adminApi().PUT('/api/v1/admin/categories/{id}/images', {
          params: { path: { id } },
          body: { images },
        }),
      ),
    paths,
  );
}
