'use client';

import { Download, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { formatDate, formatNumber } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { duration, ExecutionStatus, isActive } from './execution-status';
import { EXECUTION_STATUSES, JOB_TABS } from './job-params';
import { useDownload } from './use-download';

type Execution = Schemas['ExecutionDto'];

/** Keeps a server-rendered page fresh while something runs. */
export function useLiveRefresh(active: boolean, ms = 2500) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), ms);
    return () => clearInterval(id);
  }, [active, ms, router]);
}

/** Stats as "1,204 rows · 3 errors". */
export function statsText(stats: Record<string, number>, intl: string): string {
  return Object.entries(stats)
    .map(([k, v]) => `${formatNumber(v, intl)} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
    .join(' · ');
}

/** Every import, export and maintenance run, newest first. */
export function ActivityView({
  executions,
  total,
  page,
  limit,
  types,
}: {
  executions: Execution[];
  total: number;
  page: number;
  limit: number;
  types: Schemas['JobTypeDto'][];
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const { params, set } = useQueryParams();
  const download = useDownload();
  const title = (type: string) => types.find((x) => x.type === type)?.title ?? type;
  const filtered = ['status', 'type'].some((k) => params.get(k));
  useLiveRefresh(executions.some(isActive));

  return (
    <>
      <PageHeader
        title={t('job.title')}
        description={t('job.description')}
        breadcrumbs={[{ label: t('nav.system') }, { label: t('job.title') }]}
      />
      <SubNav items={JOB_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('orders.anyStatus')}
            options={EXECUTION_STATUSES.map((s) => ({
              value: s,
              label: t(`job.status.${s}` as MessageKey),
            }))}
          />
          <FilterSelect
            param="type"
            label={t('common.type')}
            allLabel={t('sched.anyType')}
            options={types.map((x) => ({ value: x.type, label: x.title }))}
          />
        </ListToolbar>
        {executions.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('job.job')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden lg:table-cell">{t('job.result')}</TH>
                <TH className="hidden md:table-cell">{t('job.startedBy')}</TH>
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('job.started')}
                </TH>
                <TH data-align="right">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {executions.map((e) => (
                <TR key={e.id}>
                  <TD>
                    <Link
                      href={`/jobs/${e.id}`}
                      className="focus-ring block rounded-xs font-medium hover:underline"
                    >
                      {title(e.type)}
                    </Link>
                    <span className="font-mono text-caption text-fg-muted">{e.type}</span>
                    {e.trigger === 'SCHEDULE' && (
                      <Badge tone="neutral" className="ml-2">
                        {t('job.trigger.SCHEDULE')}
                      </Badge>
                    )}
                  </TD>
                  <TD>
                    <ExecutionStatus execution={e} />
                  </TD>
                  <TD className="hidden max-w-[300px] truncate text-small text-fg-muted lg:table-cell">
                    {e.status === 'FAILED' ? (
                      <span className="text-danger-fg">{e.error ?? t('job.failed')}</span>
                    ) : (
                      [
                        statsText(e.stats, intl),
                        e.errors.length ? t('job.rowErrors', { n: e.errors.length }) : '',
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'
                    )}
                  </TD>
                  <TD className="hidden max-w-[200px] truncate text-small text-fg-muted md:table-cell">
                    {e.actorLabel}
                  </TD>
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                  >
                    {formatDate(e.createdAt, intl, true)}
                    {duration(e) && <span className="block text-caption">{duration(e)}</span>}
                  </TD>
                  <TD data-align="right">
                    {e.outputName && e.status === 'SUCCEEDED' && (
                      <Button size="sm" variant="ghost" onClick={() => download(e.id)}>
                        <Download />
                        {t('job.download')}
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Workflow />}
            title={filtered ? t('list.noMatch') : t('job.empty')}
            description={filtered ? undefined : t('job.emptyBody')}
            action={
              filtered && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => set({ status: null, type: null })}
                >
                  {t('list.clearFilters')}
                </Button>
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
    </>
  );
}
