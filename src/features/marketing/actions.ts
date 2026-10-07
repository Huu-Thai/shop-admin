'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });
const campaignPaths = (id?: string) => [
  '/promotions/campaigns',
  ...(id ? [`/promotions/campaigns/${id}`] : []),
];
const promotionPaths = (id?: string) => ['/promotions', ...(id ? [`/promotions/${id}`] : [])];
type Publish = Schemas['PublishContentDto'];

// ─── Campaigns ───

export async function createCampaign(body: Schemas['CreateCampaignDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/marketing/campaigns', { body })),
    campaignPaths(),
  );
}
export async function updateCampaign(id: string, body: Schemas['UpdateCampaignDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/marketing/campaigns/{id}', { ...one(id), body })),
    campaignPaths(id),
  );
}
export async function deleteCampaign(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/marketing/campaigns/{id}', one(id)));
    return null;
  }, campaignPaths());
}
/** Publish now or at `at`; `unpublish` ends it now or at `at`. */
export async function publishCampaign(id: string, body: Publish, unpublish = false) {
  return attempt(
    () =>
      call(
        unpublish
          ? adminApi().POST('/api/v1/admin/marketing/campaigns/{id}/unpublish', {
              ...one(id),
              body,
            })
          : adminApi().POST('/api/v1/admin/marketing/campaigns/{id}/publish', { ...one(id), body }),
      ),
    [...campaignPaths(id), '/promotions'],
  );
}

// ─── Promotions ───

export async function createPromotion(body: Schemas['CreatePromotionDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/marketing/promotions', { body })),
    promotionPaths(),
  );
}
export async function updatePromotion(id: string, body: Schemas['UpdatePromotionDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/marketing/promotions/{id}', { ...one(id), body })),
    promotionPaths(id),
  );
}
export async function deletePromotion(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/marketing/promotions/{id}', one(id)));
    return null;
  }, [...promotionPaths(), '/promotions/campaigns']);
}
export async function publishPromotion(id: string, body: Publish, unpublish = false) {
  return attempt(
    () =>
      call(
        unpublish
          ? adminApi().POST('/api/v1/admin/marketing/promotions/{id}/unpublish', {
              ...one(id),
              body,
            })
          : adminApi().POST('/api/v1/admin/marketing/promotions/{id}/publish', {
              ...one(id),
              body,
            }),
      ),
    promotionPaths(id),
  );
}

// ─── Coupons ───

export async function createCoupon(promotionId: string, body: Schemas['CreateCouponDto']) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/marketing/promotions/{id}/coupons', {
          ...one(promotionId),
          body,
        }),
      ),
    promotionPaths(promotionId),
  );
}
/** Queues a batch of random codes (the worker writes them); returns the batch id. */
export async function generateCoupons(promotionId: string, body: Schemas['GenerateCouponsDto']) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/marketing/promotions/{id}/coupons/generate', {
          ...one(promotionId),
          body,
        }),
      ),
    promotionPaths(promotionId),
  );
}
export async function updateCoupon(id: string, body: Schemas['UpdateCouponDto']) {
  return attempt(() =>
    call(adminApi().PATCH('/api/v1/admin/marketing/coupons/{id}', { ...one(id), body })),
  );
}
export async function deleteCoupon(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/marketing/coupons/{id}', one(id)));
    return null;
  });
}
