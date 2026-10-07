import { fractionDigits } from './format';

/**
 * Money is stored by the shop API in integer minor units (USD cents, VND dong). Forms work in major
 * units as typed text; these helpers convert with the currency's decimals.
 */
export function toMinor(
  major: string,
  currency: string,
  digits = fractionDigits(currency),
): number {
  const t = major.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  const [int, frac = ''] = t.replace('-', '').split('.');
  if (frac.length > digits) return NaN;
  const minor =
    Number(int) * 10 ** digits + Number((frac + '0'.repeat(digits)).slice(0, digits) || 0);
  return t.startsWith('-') ? -minor : minor;
}

export function toMajor(
  minor: number,
  currency: string,
  digits = fractionDigits(currency),
): string {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const int = Math.floor(abs / 10 ** digits);
  const frac = digits ? `.${String(abs % 10 ** digits).padStart(digits, '0')}` : '';
  return `${neg ? '-' : ''}${int}${frac}`;
}

/** A positive amount in minor units, or undefined. */
export function parsePositive(major: string, currency: string): number | undefined {
  const m = toMinor(major, currency);
  return Number.isSafeInteger(m) && m > 0 ? m : undefined;
}
