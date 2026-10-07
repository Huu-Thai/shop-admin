/** Pricing helpers shared by server and client code. Pure (unit-tested). */

export type BookStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export function bookStatus(
  b: { isActive: boolean; validFrom: string | null; validTo: string | null },
  now = new Date(),
): BookStatus {
  if (!b.isActive) return 'inactive';
  if (b.validFrom && new Date(b.validFrom) > now) return 'scheduled';
  if (b.validTo && new Date(b.validTo) <= now) return 'expired';
  return 'active';
}

export const BOOK_STATUS_TONE = {
  active: 'success',
  scheduled: 'info',
  expired: 'neutral',
  inactive: 'neutral',
} as const;

/** `2026-10-05T09:30:00.000Z` → `2026-10-05T16:30` in the browser's zone (datetime-local value). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (browser zone) → ISO, or null when empty/invalid. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Percent strings as the tax API stores them: up to 4 decimals, 0–100. */
export const PERCENT_PATTERN = /^(100(\.0{1,4})?|\d{1,2}(\.\d{1,4})?)$/;
/** Exchange rates: positive, up to 8 decimals. */
export const RATE_PATTERN = /^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,8})?$/;
