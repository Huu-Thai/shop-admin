import { en, type MessageKey, type Messages } from './en';
import { vi } from './vi';

export const LOCALES = [
  { id: 'en', label: 'English', intl: 'en-US' },
  { id: 'vi', label: 'Tiếng Việt', intl: 'vi-VN' },
] as const;
export type Locale = (typeof LOCALES)[number]['id'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'sa_locale';

/** Add a locale: create `<id>.ts` typed as `Messages` and list it here and in LOCALES. */
export const catalogues: Record<Locale, Messages> = { en, vi };

export type { MessageKey, Messages };
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l.id === value);
}

export function intlLocale(locale: Locale): string {
  return LOCALES.find((l) => l.id === locale)?.intl ?? 'en-US';
}

/**
 * `t('dash.days', { days: 7 })` → "7 days"; unknown keys fall back to English, then the key.
 * Counted messages use `{n}` and "singular|plural".
 */
export function translator(locale: Locale): Translate {
  const messages = catalogues[locale] ?? en;
  return (key, vars) => {
    let text: string = messages[key] ?? en[key] ?? key;
    // "{n} rate|{n} rates": the first form when n is 1, else the second (languages without plural
    // forms simply don't use "|").
    if (text.includes('|') && vars && typeof vars.n === 'number')
      text = text.split('|')[vars.n === 1 ? 0 : 1];
    return vars
      ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
      : text;
  };
}

/** Picks a supported locale from an Accept-Language header. */
export function negotiate(acceptLanguage: string | null | undefined): Locale {
  for (const part of (acceptLanguage ?? '').split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
