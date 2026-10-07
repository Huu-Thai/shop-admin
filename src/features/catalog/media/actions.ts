'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

export async function updateImageAlts(id: string, alts: Schemas['AltTextDto'][]) {
  return attempt(
    () =>
      call(
        adminApi().PATCH('/api/v1/admin/images/{id}', { params: { path: { id } }, body: { alts } }),
      ),
    ['/media'],
  );
}

/** `force` also unlinks the image from products and categories that use it. */
export async function deleteImage(id: string, force: boolean) {
  return attempt(async () => {
    await call(
      adminApi().DELETE('/api/v1/admin/images/{id}', {
        params: { path: { id }, query: { force } },
      }),
    );
    return null;
  }, ['/media']);
}
