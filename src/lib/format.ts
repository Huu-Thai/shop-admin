/** Locale-aware formatting helpers; money from the API is in minor units. */
export function fractionDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

export function formatMoney(
  minor: number,
  currency: string,
  locale: string,
  compact = false,
): string {
  const major = minor / 10 ** fractionDigits(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
    }).format(major);
  } catch {
    return `${major} ${currency}`;
  }
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatDate(value: string | Date, locale: string, withTime = false): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

/** Relative change; null when there is no base to compare with. */
export function change(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}
