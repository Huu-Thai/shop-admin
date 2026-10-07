'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });
type Publish = Schemas['PublishContentDto'];
const pagePaths = (id?: string) => [
  '/content',
  ...(id ? [`/content/pages/${id}`] : []),
  '/content/schedule',
];
const postPaths = (id?: string) => [
  '/content/posts',
  ...(id ? [`/content/posts/${id}`] : []),
  '/content/schedule',
];
const blockPaths = (id?: string) => [
  '/content/blocks',
  ...(id ? [`/content/blocks/${id}`] : []),
  '/content/schedule',
];

// ─── Pages ───

export async function createPage(body: Schemas['CreatePageDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/cms/pages', { body })), pagePaths());
}
export async function updatePage(id: string, body: Schemas['UpdatePageDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/cms/pages/{id}', { ...one(id), body })),
    pagePaths(id),
  );
}
export async function deletePage(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/cms/pages/{id}', one(id)));
    return null;
  }, pagePaths());
}
export async function publishPage(id: string, body: Publish, unpublish = false) {
  return attempt(
    () =>
      call(
        unpublish
          ? adminApi().POST('/api/v1/admin/cms/pages/{id}/unpublish', { ...one(id), body })
          : adminApi().POST('/api/v1/admin/cms/pages/{id}/publish', { ...one(id), body }),
      ),
    pagePaths(id),
  );
}

// ─── Posts and tags ───

export async function createPost(body: Schemas['CreatePostDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/cms/posts', { body })), postPaths());
}
export async function updatePost(id: string, body: Schemas['UpdatePostDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/cms/posts/{id}', { ...one(id), body })),
    postPaths(id),
  );
}
export async function deletePost(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/cms/posts/{id}', one(id)));
    return null;
  }, postPaths());
}
export async function publishPost(id: string, body: Publish, unpublish = false) {
  return attempt(
    () =>
      call(
        unpublish
          ? adminApi().POST('/api/v1/admin/cms/posts/{id}/unpublish', { ...one(id), body })
          : adminApi().POST('/api/v1/admin/cms/posts/{id}/publish', { ...one(id), body }),
      ),
    postPaths(id),
  );
}
export async function createTag(body: Schemas['CreateTagDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/cms/tags', { body })),
    ['/content/posts'],
  );
}
export async function updateTag(id: string, body: Schemas['UpdateTagDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/cms/tags/{id}', { ...one(id), body })),
    ['/content/posts'],
  );
}
export async function deleteTag(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/cms/tags/{id}', one(id)));
    return null;
  }, ['/content/posts']);
}

// ─── Blocks ───

export async function createBlock(body: Schemas['CreateBlockDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/cms/blocks', { body })), blockPaths());
}
export async function updateBlock(id: string, body: Schemas['UpdateBlockDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/cms/blocks/{id}', { ...one(id), body })),
    blockPaths(id),
  );
}
export async function deleteBlock(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/cms/blocks/{id}', one(id)));
    return null;
  }, blockPaths());
}
export async function publishBlock(id: string, body: Publish, unpublish = false) {
  return attempt(
    () =>
      call(
        unpublish
          ? adminApi().POST('/api/v1/admin/cms/blocks/{id}/unpublish', { ...one(id), body })
          : adminApi().POST('/api/v1/admin/cms/blocks/{id}/publish', { ...one(id), body }),
      ),
    blockPaths(id),
  );
}
export async function addPlacement(blockId: string, body: Schemas['CreatePlacementDto']) {
  return attempt(
    () =>
      call(adminApi().POST('/api/v1/admin/cms/blocks/{id}/placements', { ...one(blockId), body })),
    blockPaths(blockId),
  );
}
export async function removePlacement(blockId: string, id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/cms/block-placements/{id}', one(id)));
    return null;
  }, blockPaths(blockId));
}
