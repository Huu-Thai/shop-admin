/** Same rules as the shop API: `*` grants all, `<area>:*` every action of an area. */
export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.includes('*') || granted.includes(required)) return true;
  return granted.includes(`${required.split(':')[0]}:*`);
}

/** A safe in-app redirect target (no protocol-relative or external URLs). */
export function safeNext(next: unknown, fallback = '/'): string {
  if (
    typeof next !== 'string' ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.startsWith('/\\')
  )
    return fallback;
  return next;
}

/** Can a holder of `granted` hand out `wanted` (to a role or API key)? Mirrors the shop. */
export function canGrant(granted: readonly string[], wanted: string): boolean {
  if (granted.includes('*')) return true;
  if (wanted === '*') return false;
  if (wanted.endsWith(':*')) return granted.includes(wanted);
  return hasPermission(granted, wanted);
}
