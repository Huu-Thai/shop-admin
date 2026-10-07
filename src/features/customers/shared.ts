import type { MessageKey } from '@/i18n';

export const CUSTOMER_TABS: { href: string; label: MessageKey }[] = [
  { href: '/customers', label: 'nav.customers' },
  { href: '/customers/groups', label: 'cgroup.title' },
];

/** Mirrors the shop's password policy so the form can explain problems before saving. */
export function passwordProblems(password: string, email = ''): ('short' | 'mix' | 'email')[] {
  const out: ('short' | 'mix' | 'email')[] = [];
  if (password.length < 12) out.push('short');
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password));
  if (classes.length < 3) out.push('mix');
  const name = email.split('@')[0]?.toLowerCase();
  if (name && password.toLowerCase().includes(name)) out.push('email');
  return out;
}

const SETS = ['abcdefghijkmnpqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!#$%&*+-=?@_'];

/** A 16-character password with every character class, from the platform CSPRNG. */
export function generatePassword(length = 16): string {
  const all = SETS.join('');
  const pick = (set: string) => {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    return set[n[0] % set.length];
  };
  const chars = [
    ...SETS.map(pick),
    ...Array.from({ length: length - SETS.length }, () => pick(all)),
  ];
  // Fisher–Yates so the guaranteed classes aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    const j = n[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export const fullName = (c: { firstName: string; lastName: string }) =>
  `${c.firstName} ${c.lastName}`.trim();
