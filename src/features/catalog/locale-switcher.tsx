'use client';

import { Languages } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { cn } from '@/lib/cn';

export interface ShopLocale {
  code: string;
  name: string;
}

/**
 * Chooses which store language the translatable fields of a form show. A dot marks languages that
 * still lack a required value; the first locale is the default and must be filled in.
 */
export function LocaleSwitcher({
  locales,
  value,
  onChange,
  missing = [],
  className,
}: {
  locales: ShopLocale[];
  value: string;
  onChange: (code: string) => void;
  missing?: string[];
  className?: string;
}) {
  const { t } = useI18n();
  if (locales.length < 2) return null;
  return (
    <div
      role="tablist"
      aria-label={t('common.language')}
      className={cn('flex flex-wrap items-center gap-1', className)}
    >
      <Languages aria-hidden className="mr-1 size-4 text-fg-subtle" />
      {locales.map((l) => {
        const on = l.code === value;
        const gap = missing.includes(l.code);
        return (
          <button
            key={l.code}
            type="button"
            role="tab"
            aria-selected={on}
            title={gap ? `${l.name} · ${t('common.missingTranslation')}` : l.name}
            onClick={() => onChange(l.code)}
            className={cn(
              'focus-ring relative inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 font-mono text-caption font-medium transition-colors',
              on
                ? 'bg-primary text-primary-fg'
                : 'bg-surface-muted text-fg-muted hover:bg-border hover:text-fg',
            )}
          >
            {l.code}
            {gap && (
              <span
                aria-label={t('common.missingTranslation')}
                className="size-1.5 rounded-full bg-warning"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
