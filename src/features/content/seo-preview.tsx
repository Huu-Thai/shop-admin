'use client';

import { useI18n } from '@/i18n/client';

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** How the page may look in search results (title ~60, description ~160 characters). */
export function SeoPreview({
  title,
  url,
  description,
}: {
  title: string;
  url: string;
  description: string;
}) {
  const { t } = useI18n();
  return (
    <figure
      aria-label={t('cms.seoPreview')}
      className="rounded-lg border border-border bg-white p-4 text-left dark:bg-surface-muted"
    >
      <figcaption className="mb-2 text-caption font-semibold tracking-[0.04em] text-fg-muted uppercase">
        {t('cms.seoPreview')}
      </figcaption>
      <p className="truncate text-caption text-[#4d5156] dark:text-fg-muted">
        {url.replace(/^https?:\/\//, '')}
      </p>
      <p className="mt-0.5 truncate text-[18px] leading-6 text-[#1a0dab] dark:text-[#8ab4f8]">
        {clip(title || t('cms.untitled'), 60)}
      </p>
      <p className="mt-1 line-clamp-2 text-small text-[#4d5156] dark:text-fg-muted">
        {description ? clip(description, 160) : t('cms.seoNoDescription')}
      </p>
    </figure>
  );
}
