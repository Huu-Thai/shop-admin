'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/shipping'];
const one = (id: string) => ({ params: { path: { id } } });

export async function createShippingMethod(body: Schemas['CreateShippingMethodDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/shipping-methods', { body })), paths);
}
export async function updateShippingMethod(id: string, body: Schemas['UpdateShippingMethodDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/shipping-methods/{id}', { ...one(id), body })),
    paths,
  );
}
export async function deleteShippingMethod(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/shipping-methods/{id}', one(id)));
    return null;
  }, paths);
}
