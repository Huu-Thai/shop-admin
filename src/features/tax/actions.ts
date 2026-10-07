'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/tax', '/products', '/pricing'];
const one = (id: string) => ({ params: { path: { id } } });

export async function createTaxClass(body: Schemas['CreateTaxClassDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/tax/classes', { body })), paths);
}
export async function updateTaxClass(id: string, body: Schemas['UpdateTaxClassDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/tax/classes/{id}', { ...one(id), body })),
    paths,
  );
}
export async function deleteTaxClass(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/tax/classes/{id}', one(id)));
    return null;
  }, paths);
}

export async function createTaxZone(body: Schemas['CreateTaxZoneDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/tax/zones', { body })), paths);
}
export async function updateTaxZone(id: string, body: Schemas['UpdateTaxZoneDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/tax/zones/{id}', { ...one(id), body })),
    paths,
  );
}
export async function deleteTaxZone(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/tax/zones/{id}', one(id)));
    return null;
  }, paths);
}

export async function createTaxRate(body: Schemas['CreateTaxRateDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/tax/rates', { body })), paths);
}
export async function updateTaxRate(id: string, body: Schemas['UpdateTaxRateDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/tax/rates/{id}', { ...one(id), body })),
    paths,
  );
}
export async function deleteTaxRate(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/tax/rates/{id}', one(id)));
    return null;
  }, paths);
}
