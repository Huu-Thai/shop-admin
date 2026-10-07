'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const paths = ['/orders', '/'];
const one = (id: string) => ({ params: { path: { id } } });

export async function shipOrder(id: string, body: Schemas['CreateShipmentDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/orders/{id}/shipments', { ...one(id), body })),
    paths,
  );
}

export async function markDelivered(shipmentId: string) {
  return attempt(async () => {
    await call(adminApi().POST('/api/v1/admin/shipments/{id}/deliver', one(shipmentId)));
    return null;
  }, paths);
}

/** `key` makes a retried refund (double click, network) count once. */
export async function refundOrder(id: string, body: Schemas['CreateRefundDto'], key: string) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/orders/{id}/refunds', {
          params: { path: { id }, header: { 'idempotency-key': key } },
          body,
        }),
      ),
    paths,
  );
}

export async function cancelOrder(id: string, reason?: string) {
  return attempt(
    () =>
      call(
        adminApi().POST('/api/v1/admin/orders/{id}/cancel', {
          ...one(id),
          body: reason ? { reason } : {},
        }),
      ),
    paths,
  );
}

export async function addOrderNote(id: string, message: string, isPublic: boolean) {
  return attempt(async () => {
    await call(
      adminApi().POST('/api/v1/admin/orders/{id}/notes', {
        ...one(id),
        body: { message, isPublic },
      }),
    );
    return null;
  }, paths);
}

/** Cash on delivery: the courier collected the money. */
export async function capturePayment(paymentId: string) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/payments/{id}/capture', one(paymentId))),
    paths,
  );
}
