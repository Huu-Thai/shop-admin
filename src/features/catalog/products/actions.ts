'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/products'];
const one = (id: string) => ({ params: { path: { id } } });

export async function createProduct(body: Schemas['CreateProductDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/products', { body })), paths);
}

export async function updateProduct(id: string, body: Schemas['UpdateProductDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/products/{id}', { ...one(id), body })),
    paths,
  );
}

/** Soft delete: the product disappears from stores and can be restored. */
export async function deleteProduct(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/products/{id}', one(id)));
    return null;
  }, paths);
}

export async function restoreProduct(id: string) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/products/{id}/restore', one(id))),
    paths,
  );
}

export async function createVariant(id: string, body: Schemas['VariantInputDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/products/{id}/variants', { ...one(id), body })),
    paths,
  );
}

export async function updateVariant(
  id: string,
  variantId: string,
  body: Schemas['UpdateVariantDto'],
) {
  return attempt(
    () =>
      call(
        adminApi().PATCH('/api/v1/admin/products/{id}/variants/{variantId}', {
          params: { path: { id, variantId } },
          body,
        }),
      ),
    paths,
  );
}

export async function deleteVariant(id: string, variantId: string) {
  return attempt(async () => {
    await call(
      adminApi().DELETE('/api/v1/admin/products/{id}/variants/{variantId}', {
        params: { path: { id, variantId } },
      }),
    );
    return null;
  }, paths);
}

export async function setBundleOptions(id: string, options: Schemas['BundleOptionInputDto'][]) {
  return attempt(
    () =>
      call(
        adminApi().PUT('/api/v1/admin/products/{id}/bundle-options', {
          ...one(id),
          body: { options },
        }),
      ),
    paths,
  );
}

export async function setStoreOverride(
  id: string,
  storeId: string,
  body: Schemas['StoreOverrideInputDto'],
) {
  return attempt(
    () =>
      call(
        adminApi().PUT('/api/v1/admin/products/{id}/stores/{storeId}', {
          params: { path: { id, storeId } },
          body,
        }),
      ),
    paths,
  );
}

export async function clearStoreOverride(id: string, storeId: string) {
  return attempt(async () => {
    await call(
      adminApi().DELETE('/api/v1/admin/products/{id}/stores/{storeId}', {
        params: { path: { id, storeId } },
      }),
    );
    return null;
  }, paths);
}

export async function setRelations(id: string, body: Schemas['SetRelationsDto']) {
  return attempt(
    () => call(adminApi().PUT('/api/v1/admin/products/{id}/relations', { ...one(id), body })),
    paths,
  );
}

export async function setProductImages(id: string, images: Schemas['ImageLinkInputDto'][]) {
  return attempt(
    () =>
      call(adminApi().PUT('/api/v1/admin/products/{id}/images', { ...one(id), body: { images } })),
    paths,
  );
}

export async function setVariantImages(
  id: string,
  variantId: string,
  images: Schemas['ImageLinkInputDto'][],
) {
  return attempt(
    () =>
      call(
        adminApi().PUT('/api/v1/admin/products/{id}/variants/{variantId}/images', {
          params: { path: { id, variantId } },
          body: { images },
        }),
      ),
    paths,
  );
}
