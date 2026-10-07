'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/attributes', '/attribute-sets', '/products'];

export async function createAttribute(body: Schemas['CreateAttributeDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/attributes', { body })), paths);
}

export async function updateAttribute(id: string, body: Schemas['UpdateAttributeDto']) {
  return attempt(
    () =>
      call(adminApi().PATCH('/api/v1/admin/attributes/{id}', { params: { path: { id } }, body })),
    paths,
  );
}

export async function deleteAttribute(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/attributes/{id}', { params: { path: { id } } }));
    return null;
  }, paths);
}

export async function createAttributeSet(body: Schemas['CreateAttributeSetDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/attribute-sets', { body })), paths);
}

export async function updateAttributeSet(id: string, body: Schemas['UpdateAttributeSetDto']) {
  return attempt(
    () =>
      call(
        adminApi().PATCH('/api/v1/admin/attribute-sets/{id}', { params: { path: { id } }, body }),
      ),
    paths,
  );
}

export async function deleteAttributeSet(id: string) {
  return attempt(async () => {
    await call(
      adminApi().DELETE('/api/v1/admin/attribute-sets/{id}', { params: { path: { id } } }),
    );
    return null;
  }, paths);
}
