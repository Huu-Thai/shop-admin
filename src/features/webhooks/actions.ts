'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });
const paths = (id?: string) => ['/webhooks', ...(id ? [`/webhooks/${id}`] : [])];

/** Creates a webhook; the signing secret is in the result and is never shown again. */
export async function createWebhook(body: Schemas['CreateWebhookDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/webhooks', { body })), paths());
}
export async function updateWebhook(id: string, body: Schemas['UpdateWebhookDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/webhooks/{id}', { ...one(id), body })),
    paths(id),
  );
}
export async function deleteWebhook(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/webhooks/{id}', one(id)));
    return null;
  }, paths());
}
export async function rotateWebhookSecret(id: string) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/webhooks/{id}/rotate-secret', one(id))),
    paths(id),
  );
}
/** Sends a `webhook.ping` now. */
export async function testWebhook(id: string) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/webhooks/{id}/test', one(id))),
    paths(id),
  );
}
export async function redeliver(webhookId: string, deliveryId: string) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/webhook-deliveries/{id}/redeliver', one(deliveryId))),
    paths(webhookId),
  );
}
