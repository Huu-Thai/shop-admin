'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/cn';
import type { Schemas } from '@/server/api';

type Execution = Schemas['ExecutionDto'];
const TONE = {
  QUEUED: 'neutral',
  RUNNING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  CANCELED: 'warning',
} as const;

export const isActive = (e: Pick<Execution, 'status'>) =>
  e.status === 'QUEUED' || e.status === 'RUNNING';

/** Status, with the progress while it runs. */
export function ExecutionStatus({ execution: e, wide }: { execution: Execution; wide?: boolean }) {
  const { t } = useI18n();
  const pct = Math.round(Math.min(100, Math.max(0, e.progress)));
  return (
    <span className={cn('flex items-center gap-2', wide && 'w-full')}>
      <Badge tone={TONE[e.status]} dot={e.status === 'RUNNING'}>
        {t(`job.status.${e.status}` as MessageKey)}
      </Badge>
      {e.status === 'RUNNING' && (
        <span
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('job.progress')}
          className={cn(
            'h-1.5 overflow-hidden rounded-full bg-surface-muted',
            wide ? 'flex-1' : 'w-20',
          )}
        >
          <span
            className="block h-full rounded-full bg-info transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </span>
      )}
      {e.cancelRequested && e.status === 'RUNNING' && (
        <span className="text-caption text-fg-muted">{t('job.cancelling')}</span>
      )}
    </span>
  );
}

/** "1 m 12 s", "850 ms". */
export function duration(
  e: Pick<Execution, 'startedAt' | 'finishedAt'>,
  now = Date.now(),
): string | null {
  if (!e.startedAt) return null;
  const ms =
    (e.finishedAt ? new Date(e.finishedAt).getTime() : now) - new Date(e.startedAt).getTime();
  if (ms < 1000) return `${Math.max(0, ms)} ms`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} m ${s % 60} s`;
}
