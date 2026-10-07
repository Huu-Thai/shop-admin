import type { BadgeProps } from '@/components/ui/badge';

type Tone = NonNullable<BadgeProps['tone']>;

/** Status → badge tone (docs/STYLE-GUIDE.md §7 Badges). Server-safe; labels come from i18n. */
export const ORDER_TONE: Record<string, Tone> = {
  PENDING_PAYMENT: 'warning',
  PROCESSING: 'info',
  COMPLETE: 'success',
  CANCELED: 'danger',
  CLOSED: 'neutral',
};
export const PAYMENT_TONE: Record<string, Tone> = {
  UNPAID: 'warning',
  PAID: 'success',
  PARTIALLY_REFUNDED: 'info',
  REFUNDED: 'neutral',
};
export const FULFILLMENT_TONE: Record<string, Tone> = {
  UNFULFILLED: 'warning',
  PARTIALLY_FULFILLED: 'info',
  FULFILLED: 'success',
};
export const PAYMENT_RECORD_TONE: Record<string, Tone> = {
  PENDING: 'warning',
  AWAITING_COLLECTION: 'info',
  CAPTURED: 'success',
  FAILED: 'danger',
  CANCELED: 'neutral',
};
export const ORDER_STATUSES = Object.keys(ORDER_TONE);
export const PAYMENT_STATUSES = Object.keys(PAYMENT_TONE);
export const FULFILLMENT_STATUSES = Object.keys(FULFILLMENT_TONE);
