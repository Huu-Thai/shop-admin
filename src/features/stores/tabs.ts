import type { MessageKey } from '@/i18n';

export const STORE_TABS: { href: string; label: MessageKey }[] = [
  { href: '/stores', label: 'site.title' },
  { href: '/stores/locales', label: 'loc.title' },
  { href: '/stores/currencies', label: 'cur.title' },
  { href: '/stores/search', label: 'srch.title' },
];

/** Shop API patterns (stores module). */
export const SITE_CODE = /^[a-z][a-z0-9_-]{0,63}$/;
export const LOCALE_CODE = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2}|-[0-9]{3})?$/;
export const CURRENCY_CODE = /^[A-Z]{3}$/;
