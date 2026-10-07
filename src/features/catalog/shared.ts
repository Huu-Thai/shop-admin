/** Catalog helpers shared by server and client code. Rules mirror the shop API's validation. */

/** Codes of attributes, sets, options: `color`, `shoe_size`. */
export const CODE_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** "Red Classic Tee!" → "red-classic-tee"; strips diacritics (Áo thun → ao-thun). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/** "Shoe size" → "shoe_size" (a valid code). */
export function codify(text: string): string {
  const c = slugify(text).replace(/-/g, '_');
  return /^[a-z]/.test(c) ? c.slice(0, 64) : c ? `a_${c}`.slice(0, 64) : '';
}

/**
 * Picks the entry for the admin's language from `[{ localeCode: 'vi-VN', … }]`: exact locale,
 * then same language, then the first one.
 */
export function pickLocalized<T extends { localeCode: string }>(
  items: readonly T[],
  adminLocale: string,
): T | undefined {
  const lang = adminLocale.split('-')[0].toLowerCase();
  return (
    items.find((i) => i.localeCode.toLowerCase() === adminLocale.toLowerCase()) ??
    items.find((i) => i.localeCode.split('-')[0].toLowerCase() === lang) ??
    items[0]
  );
}

export function labelOf(
  labels: readonly { localeCode: string; label: string }[],
  adminLocale: string,
  fallback = '',
): string {
  return pickLocalized(labels, adminLocale)?.label ?? fallback;
}

/** Shallow-stable JSON for dirty checks (object keys sorted). */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

export const ATTRIBUTE_TYPES = [
  'TEXT',
  'TEXTAREA',
  'INTEGER',
  'DECIMAL',
  'BOOLEAN',
  'DATE',
  'SELECT',
  'MULTISELECT',
] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];
export const hasOptions = (t: string) => t === 'SELECT' || t === 'MULTISELECT';
