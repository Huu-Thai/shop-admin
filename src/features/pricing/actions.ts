'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/pricing', '/products'];

export async function createPriceBook(body: Schemas['CreatePriceBookDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/price-books', { body })), paths);
}

export async function updatePriceBook(id: string, body: Schemas['UpdatePriceBookDto']) {
  return attempt(
    () =>
      call(adminApi().PATCH('/api/v1/admin/price-books/{id}', { params: { path: { id } }, body })),
    paths,
  );
}

export async function deletePriceBook(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/price-books/{id}', { params: { path: { id } } }));
    return null;
  }, paths);
}

/** Upserts entries by (variant, minimum quantity). */
export async function setPriceEntries(id: string, entries: Schemas['PriceEntryInputDto'][]) {
  return attempt(
    () =>
      call(
        adminApi().PUT('/api/v1/admin/price-books/{id}/entries', {
          params: { path: { id } },
          body: { entries },
        }),
      ),
    paths,
  );
}

export async function deletePriceEntry(id: string, entryId: string) {
  return attempt(async () => {
    await call(
      adminApi().DELETE('/api/v1/admin/price-books/{id}/entries/{entryId}', {
        params: { path: { id, entryId } },
      }),
    );
    return null;
  }, paths);
}

export async function createExchangeRate(body: Schemas['CreateExchangeRateDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/exchange-rates', { body })), paths);
}

export async function createCurrency(body: Schemas['CreateCurrencyDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/currencies', { body })), paths);
}

export async function updateCurrency(code: string, body: Schemas['UpdateCurrencyDto']) {
  return attempt(
    () =>
      call(
        adminApi().PATCH('/api/v1/admin/currencies/{code}', { params: { path: { code } }, body }),
      ),
    paths,
  );
}
