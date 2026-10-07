'use client';

import { Ban, Download, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate, formatNumber } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { useLiveRefresh } from './activity-view';
import { duration, ExecutionStatus, isActive } from './execution-status';
import { cancelExecution, runJob } from './jobs-actions';
import { useDownload } from './use-download';

type Execution = Schemas['ExecutionDto'];

/** One run: progress, counts, row problems, its file, cancel / run again. */
export function ExecutionDetail({
  execution: e,
  type,
  canWrite,
}: {
  execution: Execution;
  type: Schemas['JobTypeDto'] | undefined;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const download = useDownload();
  useLiveRefresh(isActive(e), 1500);
  const title = type?.title ?? e.type;
  const params = Object.keys(e.params).length ? JSON.stringify(e.params, null, 2) : null;

  return (
    <>
      <PageHeader
        title={title}
        description={type?.description}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('job.title'), href: '/jobs' },
          { label: title },
        ]}
        actions={
          <>
            {canWrite && isActive(e) && !e.cancelRequested && (
              <Confirm
                trigger={
                  <Button variant="secondary">
                    <Ban />
                    {t('job.cancel')}
                  </Button>
                }
                title={t('job.cancelTitle')}
                description={t('job.cancelBody')}
                confirmLabel={t('job.cancel')}
                cancelLabel={t('common.close')}
                onConfirm={async () => {
                  const ok = await runAction(cancelExecution(e.id), {
                    success: t('job.cancelRequested'),
                  });
                  if (ok) router.refresh();
                  return !!ok;
                }}
              />
            )}
            {canWrite && !isActive(e) && type && !type.input && (
              <Button
                variant="secondary"
                onClick={async () => {
                  const next = await runAction(runJob(e.type, e.params), {
                    success: t('job.started'),
                  });
                  if (next) router.push(`/jobs/${next.id}`);
                }}
              >
                <RotateCcw />
                {t('job.runAgain')}
              </Button>
            )}
            {canWrite && !isActive(e) && type?.input === 'csv' && (
              <Button asChild variant="secondary">
                <Link href={`/jobs/import?type=${e.type}`}>
                  <RotateCcw />
                  {t('job.importAgain')}
                </Link>
              </Button>
            )}
            {e.outputName && e.status === 'SUCCEEDED' && (
              <Button onClick={() => download(e.id)}>
                <Download />
                {t('job.downloadFile', { name: e.outputName })}
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardBody className="grid gap-5">
              <ExecutionStatus execution={e} wide />
              {e.status === 'FAILED' && e.error && (
                <p
                  role="alert"
                  className="rounded-md bg-danger-soft px-4 py-3 text-small break-words text-danger-fg"
                >
                  {e.error}
                </p>
              )}
              {Object.keys(e.stats).length > 0 && (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(e.stats).map(([k, v]) => (
                    <div key={k} className="rounded-md bg-surface-muted/60 px-4 py-3">
                      <dt className="text-caption text-fg-muted capitalize">
                        {k.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </dt>
                      <dd className="tabular mt-1 text-h3 font-semibold">
                        {formatNumber(v, intl)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {isActive(e) && <p className="text-small text-fg-muted">{t('job.liveHint')}</p>}
            </CardBody>
          </Card>
          {e.errors.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader
                title={t('job.rowErrorsTitle')}
                description={t('job.rowErrorsHint', { n: e.errors.length })}
              />
              <div className="mt-4">
                <Table>
                  <THead>
                    <tr>
                      <TH className="w-24" data-align="right">
                        {t('job.row')}
                      </TH>
                      <TH>{t('job.problem')}</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {e.errors.map((r, i) => (
                      <TR key={`${r.row}-${i}`}>
                        <TD className="tabular font-mono" data-align="right">
                          {r.row}
                        </TD>
                        <TD className="text-danger-fg">{r.message}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
        <Card>
          <CardHeader title={t('common.details')} />
          <CardBody className="grid gap-3 pt-4 text-small">
            <dl className="grid gap-2">
              {[
                [t('job.trigger'), t(`job.trigger.${e.trigger}` as MessageKey)],
                [t('job.startedBy'), e.actorLabel],
                [t('job.queued'), formatDate(e.createdAt, intl, true)],
                [t('job.started'), e.startedAt ? formatDate(e.startedAt, intl, true) : '—'],
                [t('job.finished'), e.finishedAt ? formatDate(e.finishedAt, intl, true) : '—'],
                [t('job.duration'), duration(e) ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-fg-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {params && (
              <div className="grid gap-1.5 border-t border-border pt-3">
                <span className="text-fg-muted">{t('job.params')}</span>
                <pre className="overflow-auto rounded-md bg-surface-muted p-3 font-mono text-caption">
                  {params}
                </pre>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
