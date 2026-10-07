import type { BadgeProps } from '@/components/ui/badge';
import type { MessageKey } from '@/i18n';

type Tone = NonNullable<BadgeProps['tone']>;

export const LOYALTY_TABS: { href: string; label: MessageKey }[] = [
  { href: '/loyalty', label: 'loy.programs' },
  { href: '/loyalty/accounts', label: 'loy.accounts' },
];

export const TX_TYPES = ['EARN', 'REDEEM', 'EXPIRE', 'ADJUST', 'REVERSE'] as const;
export const TX_TONE: Record<string, Tone> = {
  EARN: 'success',
  REDEEM: 'info',
  EXPIRE: 'neutral',
  ADJUST: 'accent',
  REVERSE: 'warning',
};

/** 15000 basis points → "×1.5". */
export const multiplier = (bp: number) =>
  `×${(bp / 10_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
