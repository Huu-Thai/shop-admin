import type { MessageKey } from '@/i18n';

export const MARKETING_TABS: { href: string; label: MessageKey }[] = [
  { href: '/promotions', label: 'promo.title' },
  { href: '/promotions/campaigns', label: 'camp.title' },
  { href: '/promotions/simulate', label: 'sim.title' },
];

export const CAMPAIGN_CODE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
export const COUPON_CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;

export const CONTENT_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;
