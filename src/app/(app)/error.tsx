'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { useI18n } from '@/i18n/client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => console.error(error), [error]);
  return (
    <EmptyState
      className="min-h-[60vh]"
      icon={<TriangleAlert />}
      title={t('error.title')}
      description={
        <>
          {t('error.body')}
          {error.digest && (
            <span className="mt-3 block font-mono text-caption text-fg-subtle">
              ref {error.digest}
            </span>
          )}
        </>
      }
      action={<Button onClick={reset}>{t('error.retry')}</Button>}
    />
  );
}
