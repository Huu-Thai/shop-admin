import type { MessageKey } from '@/i18n';

export const ACCESS_TABS: { href: string; label: MessageKey }[] = [
  { href: '/users', label: 'usr.title' },
  { href: '/users/roles', label: 'role.title' },
  { href: '/users/api-keys', label: 'key.title' },
];

export type Permission = { key: string; area: string; description: string };

/** Permissions grouped by area, in catalogue order. */
export function byArea(perms: Permission[]): { area: string; perms: Permission[] }[] {
  const out: { area: string; perms: Permission[] }[] = [];
  for (const p of perms) {
    const g = out.find((x) => x.area === p.area);
    if (g) g.perms.push(p);
    else out.push({ area: p.area, perms: [p] });
  }
  return out;
}

/**
 * Toggles one permission in a grant list, expanding `*` and `<area>:*` into concrete keys when one
 * of their permissions is removed (so the rest stay granted).
 */
export function togglePermission(
  value: string[],
  key: string,
  on: boolean,
  all: Permission[],
): string[] {
  const area = key.split(':')[0];
  if (on) return value.includes(key) ? value : [...value, key];
  let next = value;
  if (next.includes('*')) next = all.map((p) => p.key);
  if (next.includes(`${area}:*`))
    next = [
      ...next.filter((v) => v !== `${area}:*`),
      ...all.filter((p) => p.area === area).map((p) => p.key),
    ];
  return [...new Set(next.filter((v) => v !== key))];
}
