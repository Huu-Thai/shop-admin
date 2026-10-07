'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { useQueryParams } from '@/lib/use-query-params';

/** Table footer: "1–25 of 312" and previous / next (docs/STYLE-GUIDE.md §7 Table). */
export function Pagination({
  page,
  limit,
  total,
  className,
}: {
  page: number;
  limit: number;
  total: number;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const { href } = useQueryParams();
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);
  const n = new Intl.NumberFormat(intlLocale(locale));
  const link = (p: number, disabled: boolean, label: string, icon: React.ReactNode) =>
    disabled ? (
      <span
        aria-disabled="true"
        className="flex size-8 items-center justify-center rounded-md text-fg-subtle opacity-50"
      >
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    ) : (
      <Link
        href={href({ page: p === 1 ? null : p })}
        scroll={false}
        aria-label={label}
        className="focus-ring flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg"
      >
        {icon}
      </Link>
    );
  return (
    <nav
      aria-label={t('list.pagination')}
      className={cn(
        'flex items-center justify-between gap-4 border-t border-border px-5 py-3 text-small text-fg-muted',
        className,
      )}
    >
      <p className="tabular">
        {t('list.range', { from: n.format(from), to: n.format(to), total: n.format(total) })}
      </p>
      <div className="flex items-center gap-1">
        <span className="tabular mr-2">
          {t('list.page', { page: n.format(page), pages: n.format(pages) })}
        </span>
        {link(page - 1, page <= 1, t('list.previous'), <ChevronLeft className="size-4" />)}
        {link(page + 1, page >= pages, t('list.next'), <ChevronRight className="size-4" />)}
      </div>
    </nav>
  );
}
