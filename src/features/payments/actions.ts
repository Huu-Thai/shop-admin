'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/payments'];
const one = (id: string) => ({ params: { path: { id } } });

export async function createProvider(body: Schemas['CreateProviderDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/payment-providers', { body })), paths);
}
export async function updateProvider(id: string, body: Schemas['UpdateProviderDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/payment-providers/{id}', { ...one(id), body })),
    paths,
  );
}
export async function deleteProvider(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/payment-providers/{id}', one(id)));
    return null;
  }, paths);
}
export async function createMethod(body: Schemas['CreateStoreMethodDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/payment-methods', { body })), paths);
}
export async function updateMethod(id: string, body: Schemas['UpdateStoreMethodDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/payment-methods/{id}', { ...one(id), body })),
    paths,
  );
}
export async function deleteMethod(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/payment-methods/{id}', one(id)));
    return null;
  }, paths);
}
/** Ask providers about pending payments and refunds now (a job does it every few minutes). */
export async function reconcilePayments() {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/payments/reconcile')),
    ['/payments', '/orders'],
  );
}
