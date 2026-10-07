'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });
type Publish = Schemas['PublishContentDto'];
const bannerPaths = (id?: string) => [
  '/merchandising',
  ...(id ? [`/merchandising/${id}`] : []),
  '/content/schedule',
];
const sliderPaths = (id?: string) => [
  '/merchandising/sliders',
  ...(id ? [`/merchandising/sliders/${id}`] : []),
  '/content/schedule',
];

export async function createBanner(body: Schemas['CreateBannerDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/merchandising/banners', { body })),
    bannerPaths(),
  );
}
export async function updateBanner(id: string, body: Schemas['UpdateBannerDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/merchandising/banners/{id}', { ...one(id), body })),
    bannerPaths(id),
  );
}
export async function deleteBanner(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/merchandising/banners/{id}', one(id)));
    return null;
  }, bannerPaths());
}
export async function publishBanner(id: string, body: Publish, unpublish = false) {
  return attempt(
    () =>
      call(
        unpublish
          ? adminApi().POST('/api/v1/admin/merchandising/banners/{id}/unpublish', {
              ...one(id),
              body,
            })
          : adminApi().POST('/api/v1/admin/merchandising/banners/{id}/publish', {
              ...one(id),
              body,
            }),
      ),
    bannerPaths(id),
  );
}

export async function createSlider(body: Schemas['CreateSliderDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/merchandising/sliders', { body })),
    sliderPaths(),
  );
}
export async function updateSlider(id: string, body: Schemas['UpdateSliderDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/merchandising/sliders/{id}', { ...one(id), body })),
    sliderPaths(id),
  );
}
export async function deleteSlider(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/merchandising/sliders/{id}', one(id)));
    return null;
  }, sliderPaths());
}
export async function publishSlider(id: string, body: Publish, unpublish = false) {
  return attempt(
    () =>
      call(
        unpublish
          ? adminApi().POST('/api/v1/admin/merchandising/sliders/{id}/unpublish', {
              ...one(id),
              body,
            })
          : adminApi().POST('/api/v1/admin/merchandising/sliders/{id}/publish', {
              ...one(id),
              body,
            }),
      ),
    sliderPaths(id),
  );
}
export async function createSlide(sliderId: string, body: Schemas['CreateSlideDto']) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/merchandising/sliders/{id}/slides', {
          ...one(sliderId),
          body,
        }),
      ),
    sliderPaths(sliderId),
  );
}
export async function updateSlide(sliderId: string, id: string, body: Schemas['UpdateSlideDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/merchandising/slides/{id}', { ...one(id), body })),
    sliderPaths(sliderId),
  );
}
/** Reorders slides: new positions, one request each. */
export async function reorderSlides(sliderId: string, order: string[]) {
  return attempt(async () => {
    for (const [position, id] of order.entries())
      await call(
        adminApi().PATCH('/api/v1/admin/merchandising/slides/{id}', {
          ...one(id),
          body: { position },
        }),
      );
    return null;
  }, sliderPaths(sliderId));
}
export async function deleteSlide(sliderId: string, id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/merchandising/slides/{id}', one(id)));
    return null;
  }, sliderPaths(sliderId));
}
