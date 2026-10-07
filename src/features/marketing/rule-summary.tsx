'use client';

import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { type Action, type Condition, describe } from './rules';

/** One line per rule in plain words ("10% off the cart · Free shipping"). */
export function RuleSummary({ rules, empty }: { rules: (Condition | Action)[]; empty?: string }) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  if (!rules.length) return <span className="text-small text-fg-muted">{empty ?? '—'}</span>;
  return (
    <span className="line-clamp-2 text-small text-fg-muted">
      {rules
        .map((r) => {
          const d = describe(r, (minor, c) => formatMoney(minor, c, intl));
          return t(d.key as MessageKey, d.params);
        })
        .join(' · ')}
    </span>
  );
}
