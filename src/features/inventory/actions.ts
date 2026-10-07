'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/inventory', '/products'];

export async function adjustStock(body: Schemas['StockAdjustmentDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/inventory/adjustments', { body })),
    paths,
  );
}

export async function createSource(body: Schemas['CreateInventorySourceDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/inventory/sources', { body })), paths);
}

export async function updateSource(id: string, body: Schemas['UpdateInventorySourceDto']) {
  return attempt(
    () =>
      call(
        adminApi().PATCH('/api/v1/admin/inventory/sources/{id}', {
          params: { path: { id } },
          body,
        }),
      ),
    paths,
  );
}

export async function setWebsiteSources(id: string, sources: Schemas['WebsiteSourceInputDto'][]) {
  return attempt(
    () =>
      call(
        adminApi().PUT('/api/v1/admin/websites/{id}/inventory-sources', {
          params: { path: { id } },
          body: { sources },
        }),
      ),
    paths,
  );
}

export async function releaseReservation(groupId: string) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/inventory/reservations/{groupId}/release', {
          params: { path: { groupId } },
        }),
      ),
    paths,
  );
}

export async function convertReservation(groupId: string) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/inventory/reservations/{groupId}/convert', {
          params: { path: { groupId } },
        }),
      ),
    paths,
  );
}
