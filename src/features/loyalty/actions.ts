'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/loyalty', '/loyalty/accounts'];

export async function saveProgram(websiteId: string, body: Schemas['UpsertProgramDto']) {
  return attempt(
    () =>
      call(
        adminApi().PUT('/api/v1/admin/loyalty/programs/{websiteId}', {
          params: { path: { websiteId } },
          body,
        }),
      ),
    paths,
  );
}
export async function createTier(websiteId: string, body: Schemas['CreateTierDto']) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/loyalty/programs/{websiteId}/tiers', {
          params: { path: { websiteId } },
          body,
        }),
      ),
    paths,
  );
}
export async function updateTier(id: string, body: Schemas['UpdateTierDto']) {
  return attempt(
    () =>
      call(
        adminApi().PATCH('/api/v1/admin/loyalty/tiers/{id}', { params: { path: { id } }, body }),
      ),
    paths,
  );
}
export async function deleteTier(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/loyalty/tiers/{id}', { params: { path: { id } } }));
    return null;
  }, paths);
}
/** Manual credit (positive) or debit (negative) with a reason, written to the ledger. */
export async function adjustPoints(customerId: string, body: Schemas['AdjustDto']) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/loyalty/customers/{customerId}/adjust', {
          params: { path: { customerId } },
          body,
        }),
      ),
    [...paths, `/customers/${customerId}`],
  );
}
