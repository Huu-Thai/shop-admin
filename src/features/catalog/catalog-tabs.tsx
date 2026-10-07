'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';

/** Secondary navigation between closely related catalog screens. */
/**
 * A tab is active on its own path and below it, unless a more specific tab matches (so `/pricing`
 * isn't active on `/pricing/rates`).
 */
export function SubNav({ items }: { items: { href: string; label: MessageKey }[] }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav
      aria-label="Section"
      // Scrolls sideways on phones; the rule is an inset shadow so the overflow doesn't clip it.
      className="-mt-2 mb-6 flex [scrollbar-width:none] gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)]"
    >
      {items.map((i) => {
        const matches = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
        const best = items
          .filter((x) => matches(x.href))
          .sort((a, b) => b.href.length - a.href.length)[0];
        const on = best?.href === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'focus-ring relative shrink-0 rounded-t-md px-3 py-2.5 text-body font-medium whitespace-nowrap transition-colors',
              on ? 'text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {t(i.label)}
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary transition-opacity',
                on ? 'opacity-100' : 'opacity-0',
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export const ATTRIBUTE_TABS: { href: string; label: MessageKey }[] = [
  { href: '/attributes', label: 'attr.title' },
  { href: '/attribute-sets', label: 'sets.title' },
];
