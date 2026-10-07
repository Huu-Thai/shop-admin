'use client';

import { Webhook } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { PAYMENT_TABS } from './payments-view';

const TONE = { PROCESSED: 'success', IGNORED: 'neutral', FAILED: 'danger' } as const;

/** Notifications received from payment providers — the first place to look when a payment hangs. */
export function WebhooksView({
  events,
  total,
  page,
  limit,
  providers,
}: {
  events: Schemas['WebhookEventDto'][];
  total: number;
  page: number;
  limit: number;
  providers: Schemas['ProviderDto'][];
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  return (
    <>
      <PageHeader
        title={t('pay.title')}
        description={t('pay.webhooksDescription')}
        breadcrumbs={[{ label: t('nav.sales') }, { label: t('pay.webhooks') }]}
      />
      <SubNav items={PAYMENT_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('orders.anyStatus')}
            options={(['PROCESSED', 'IGNORED', 'FAILED'] as const).map((s) => ({
              value: s,
              label: t(`wh.${s}` as MessageKey),
            }))}
          />
          {providers.length > 1 && (
            <FilterSelect
              param="providerId"
              label={t('pay.provider')}
              allLabel={t('pay.allProviders')}
              options={providers.map((p) => ({ value: p.id, label: p.name }))}
            />
          )}
        </ListToolbar>
        {events.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('inv.when')}</TH>
                <TH>{t('pay.provider')}</TH>
                <TH>{t('pay.event')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden lg:table-cell">{t('inv.details')}</TH>
              </tr>
            </THead>
            <TBody>
              {events.map((e) => (
                <TR key={e.id}>
                  <TD className="text-small whitespace-nowrap text-fg-muted">
                    {formatDate(e.receivedAt, intl, true)}
                  </TD>
                  <TD>{providers.find((p) => p.id === e.providerId)?.name ?? '—'}</TD>
                  <TD>
                    <span className="block font-mono text-small">{e.eventType}</span>
                    <span className="block truncate font-mono text-caption text-fg-subtle">
                      {e.providerEventId}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={TONE[e.status]} dot>
                      {t(`wh.${e.status}` as MessageKey)}
                    </Badge>
                  </TD>
                  <TD className="hidden max-w-[360px] truncate text-small text-danger-fg lg:table-cell">
                    {e.error ?? ''}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Webhook />}
            title={t('pay.noWebhooks')}
            description={t('pay.noWebhooksBody')}
          />
        )}
        {total > limit && <Pagination page={page} limit={limit} total={total} />}
      </Card>
    </>
  );
}
