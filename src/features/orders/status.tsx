'use client';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { FULFILLMENT_TONE, ORDER_TONE, PAYMENT_RECORD_TONE, PAYMENT_TONE } from './tones';

type Tone = NonNullable<BadgeProps['tone']>;

const KINDS: Record<
  'order' | 'payment' | 'fulfillment' | 'record',
  [string, Record<string, Tone>]
> = {
  order: ['ostatus', ORDER_TONE],
  payment: ['pstatus', PAYMENT_TONE],
  fulfillment: ['fstatus', FULFILLMENT_TONE],
  record: ['precord', PAYMENT_RECORD_TONE],
};

/** A translated status badge for orders and payments. */
export function StatusBadge({
  status,
  kind = 'order',
}: {
  status: string;
  kind?: keyof typeof KINDS;
}) {
  const { t } = useI18n();
  const [prefix, tones] = KINDS[kind];
  const key = `${prefix}.${status}` as MessageKey;
  const label = t(key);
  return (
    <Badge tone={tones[status] ?? 'neutral'} dot>
      {label === key ? status : label}
    </Badge>
  );
}
