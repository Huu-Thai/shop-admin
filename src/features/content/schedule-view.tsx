'use client';

import { CalendarClock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
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
import { formatDate } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { CONTENT_TABS, CONTENT_TYPES, SCHEDULE_STATUSES } from './tabs';

type Schedule = Schemas['ScheduleDto'];
const STATUS_TONE = {
  PENDING: 'info',
  DONE: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
} as const;

/** Where each kind of scheduled content is edited. */
export const targetHref = (s: Pick<Schedule, 'targetType' | 'targetId'>) =>
  ({
    PAGE: `/content/pages/${s.targetId}`,
    POST: `/content/posts/${s.targetId}`,
    BLOCK: `/content/blocks/${s.targetId}`,
    BANNER: `/merchandising/${s.targetId}`,
    SLIDER: `/merchandising/sliders/${s.targetId}`,
    CAMPAIGN: `/promotions/campaigns/${s.targetId}`,
    PROMOTION: `/promotions/${s.targetId}`,
  })[s.targetType];

/** Upcoming and past publish / unpublish times of every kind of content. */
export function ScheduleView({
  schedules,
  total,
  page,
  limit,
}: {
  schedules: Schedule[];
  total: number;
  page: number;
  limit: number;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const { params, set } = useQueryParams();
  const status = params.get('status') ?? 'PENDING';
  const filtered = !!params.get('targetType') || status !== 'PENDING';

  return (
    <>
      <PageHeader
        title={t('sched.title')}
        description={t('sched.description')}
        breadcrumbs={[{ label: t('nav.content') }, { label: t('sched.title') }]}
      />
      <SubNav items={CONTENT_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('sched.upcoming')}
            options={[
              { value: 'all', label: t('sched.all') },
              ...SCHEDULE_STATUSES.filter((s) => s !== 'PENDING').map((s) => ({
                value: s,
                label: t(`sched.status.${s}` as MessageKey),
              })),
            ]}
          />
          <FilterSelect
            param="targetType"
            label={t('common.type')}
            allLabel={t('sched.anyType')}
            options={CONTENT_TYPES.map((x) => ({
              value: x,
              label: t(`sched.type.${x}` as MessageKey),
            }))}
          />
        </ListToolbar>
        {schedules.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('sched.when')}</TH>
                <TH>{t('sched.action')}</TH>
                <TH>{t('sched.what')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden md:table-cell" data-align="right">
                  {t('sched.ran')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {schedules.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium whitespace-nowrap">
                    {formatDate(s.runAt, intl, true)}
                  </TD>
                  <TD>
                    <span className="flex items-center gap-1.5 text-small">
                      {s.action === 'PUBLISH' ? (
                        <Eye aria-hidden className="size-4 text-success" />
                      ) : (
                        <EyeOff aria-hidden className="size-4 text-fg-muted" />
                      )}
                      {t(s.action === 'PUBLISH' ? 'sched.publish' : 'sched.unpublish')}
                    </span>
                  </TD>
                  <TD className="max-w-[360px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge tone="neutral">{t(`sched.type.${s.targetType}` as MessageKey)}</Badge>
                      {s.targetLabel ? (
                        <Link
                          href={targetHref(s)}
                          className="focus-ring truncate rounded-xs hover:underline"
                        >
                          {s.targetLabel}
                        </Link>
                      ) : (
                        <span className="text-fg-subtle">{t('sched.deleted')}</span>
                      )}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[s.status]}>
                      {t(`sched.status.${s.status}` as MessageKey)}
                    </Badge>
                    {s.attempts > 1 && (
                      <span className="ml-2 text-caption text-fg-muted">×{s.attempts}</span>
                    )}
                  </TD>
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted md:table-cell"
                  >
                    {s.executedAt ? formatDate(s.executedAt, intl, true) : '—'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<CalendarClock />}
            title={filtered ? t('list.noMatch') : t('sched.empty')}
            description={filtered ? undefined : t('sched.emptyBody')}
            action={
              filtered && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => set({ status: null, targetType: null })}
                >
                  {t('list.clearFilters')}
                </Button>
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      <p className="mt-3 text-small text-fg-muted">{t('sched.footnote')}</p>
    </>
  );
}
