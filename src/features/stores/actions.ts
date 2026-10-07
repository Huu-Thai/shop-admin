'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });
const storePaths = ['/stores'];

export async function createWebsite(body: Schemas['CreateWebsiteDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/websites', { body })), storePaths);
}
export async function updateWebsite(id: string, body: Schemas['UpdateWebsiteDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/websites/{id}', { ...one(id), body })),
    storePaths,
  );
}
export async function deleteWebsite(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/websites/{id}', one(id)));
    return null;
  }, storePaths);
}

export async function createStore(body: Schemas['CreateStoreDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/stores', { body })), storePaths);
}
export async function updateStore(id: string, body: Schemas['UpdateStoreDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/stores/{id}', { ...one(id), body })),
    storePaths,
  );
}
export async function deleteStore(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/stores/{id}', one(id)));
    return null;
  }, storePaths);
}

const code = (c: string) => ({ params: { path: { code: c } } });

export async function createLocale(body: Schemas['CreateLocaleDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/locales', { body })),
    ['/stores/locales'],
  );
}
export async function updateLocale(c: string, body: Schemas['UpdateLocaleDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/locales/{code}', { ...code(c), body })),
    ['/stores/locales'],
  );
}
export async function createCurrency(body: Schemas['CreateCurrencyDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/currencies', { body })),
    ['/stores/currencies'],
  );
}
export async function updateCurrency(c: string, body: Schemas['UpdateCurrencyDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/currencies/{code}', { ...code(c), body })),
    ['/stores/currencies'],
  );
}

const site = (websiteId: string) => ({ params: { path: { websiteId } } });

export async function saveSearchSettings(
  websiteId: string,
  body: Schemas['UpdateSearchSettingsDto'],
) {
  return attempt(
    () =>
      call(
        adminApi().PUT('/api/v1/admin/search/websites/{websiteId}', { ...site(websiteId), body }),
      ),
    ['/stores/search'],
  );
}
export async function reindexSearch(websiteId: string) {
  return attempt(async () => {
    await call(
      adminApi().POST('/api/v1/admin/search/websites/{websiteId}/reindex', site(websiteId)),
    );
    return null;
  }, ['/stores/search']);
}
