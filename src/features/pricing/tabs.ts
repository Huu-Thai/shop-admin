import type { MessageKey } from '@/i18n';

export const PRICING_TABS: { href: string; label: MessageKey }[] = [
  { href: '/pricing', label: 'price.books' },
  { href: '/pricing/rates', label: 'price.rates' },
  { href: '/pricing/preview', label: 'price.preview' },
  { href: '/tax', label: 'tax.title' },
];

export const INVENTORY_TABS: { href: string; label: MessageKey }[] = [
  { href: '/inventory', label: 'inv.stock' },
  { href: '/inventory/movements', label: 'inv.movements' },
  { href: '/inventory/sources', label: 'inv.sources' },
  { href: '/inventory/reservations', label: 'inv.reservations' },
];
