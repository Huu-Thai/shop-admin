'use client';

import { ChevronDown, ChevronRight, KeyRound, Pencil, RotateCcw, Send, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/feedback';
import { FilterSelect, ListToolbar } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SecretDialog } from '../access/api-keys-view';
import { useLiveRefresh } from '../system/activity-view';
import { deleteWebhook, redeliver, rotateWebhookSecret, testWebhook } from './actions';
import { DELIVERY_STATUSES } from './events';
import { HookStatus, WebhookSheet } from './webhooks-view';

type Hook = Schemas['WebhookDto'];
type Delivery = Schemas['WebhookDeliveryDto'];
const TONE = { PENDING: 'info', SUCCEEDED: 'success', FAILED: 'danger' } as const;

/** One webhook: its settings, signing secret, test ping and delivery log with redelivery. */
export function WebhookDetail({
  hook,
  events,
  deliveries,
  total,
  page,
  limit,
  canWrite,
}: {
  hook: Hook;
  events: Schemas['WebhookEventTypeDto'][];
  deliveries: Delivery[];
  total: number;
  page: number;
  limit: number;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  useLiveRefresh(
    deliveries.some((d) => d.status === 'PENDING' && !d.nextAttemptAt),
    2000,
  );

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {hook.name}
            <HookStatus hook={hook} />
          </span>
        }
        description={<code className="font-mono">{hook.url}</code>}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('wh2.title'), href: '/webhooks' },
          { label: hook.name },
        ]}
        actions={
          canWrite && (
            <>
              <Button
                variant="secondary"
                loading={testing}
                onClick={async () => {
                  setTesting(true);
                  const ok = await runAction(testWebhook(hook.id), { success: t('wh2.pingSent') });
                  setTesting(false);
                  if (ok) router.refresh();
                }}
              >
                <Send />
                {t('wh2.sendTest')}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil />
                {t('common.edit')}
              </Button>
            </>
          )
        }
      />
      {hook.disabledReason && (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-small text-danger-fg"
        >
          {t('wh2.disabled', { reason: hook.disabledReason })}
        </p>
      )}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <CardHeader title={t('wh2.deliveries')} description={t('wh2.deliveriesHint')} />
          <ListToolbar className="mt-4">
            <FilterSelect
              param="status"
              label={t('common.status')}
              allLabel={t('orders.anyStatus')}
              options={DELIVERY_STATUSES.map((s) => ({
                value: s,
                label: t(`wh2.dstatus.${s}` as MessageKey),
              }))}
            />
          </ListToolbar>
          {deliveries.length ? (
            <Table>
              <THead>
                <tr>
                  <TH className="w-8">
                    <span className="sr-only">{t('audit.details')}</span>
                  </TH>
                  <TH>{t('wh2.event')}</TH>
                  <TH>{t('common.status')}</TH>
                  <TH className="hidden md:table-cell" data-align="right">
                    {t('wh2.response')}
                  </TH>
                  <TH className="hidden sm:table-cell" data-align="right">
                    {t('common.created')}
                  </TH>
                  <TH data-align="right">
                    <span className="sr-only">{t('list.actions')}</span>
                  </TH>
                </tr>
              </THead>
              <TBody>
                {deliveries.map((d) => {
                  const expanded = open === d.id;
                  return (
                    <Fragment key={d.id}>
                      <TR data-state={expanded ? 'selected' : undefined}>
                        <TD>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-expanded={expanded}
                            aria-label={t('audit.details')}
                            onClick={() => setOpen(expanded ? null : d.id)}
                          >
                            {expanded ? <ChevronDown /> : <ChevronRight />}
                          </Button>
                        </TD>
                        <TD className="font-mono text-small">{d.eventName}</TD>
                        <TD>
                          <Badge tone={TONE[d.status]}>
                            {t(`wh2.dstatus.${d.status}` as MessageKey)}
                          </Badge>
                          {d.attempts > 1 && (
                            <span className="ml-2 text-caption text-fg-muted">×{d.attempts}</span>
                          )}
                        </TD>
                        <TD
                          className="tabular hidden text-small text-fg-muted md:table-cell"
                          data-align="right"
                        >
                          {d.responseStatus ?? '—'}
                          {d.durationMs != null && <span className="ml-2">{d.durationMs} ms</span>}
                        </TD>
                        <TD
                          className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                          data-align="right"
                        >
                          {formatDate(d.createdAt, intl, true)}
                        </TD>
                        <TD data-align="right">
                          {canWrite && d.status !== 'PENDING' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const ok = await runAction(redeliver(hook.id, d.id), {
                                  success: t('wh2.redelivered'),
                                });
                                if (ok) router.refresh();
                              }}
                            >
                              <RotateCcw />
                              {t('wh2.redeliver')}
                            </Button>
                          )}
                        </TD>
                      </TR>
                      {expanded && (
                        <tr className="bg-surface-muted/40">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                              <div className="grid content-start gap-1.5">
                                <span className="text-caption font-semibold tracking-[0.04em] text-fg-muted uppercase">
                                  {t('wh2.payload')}
                                </span>
                                <pre className="max-h-72 overflow-auto rounded-md bg-surface p-3 font-mono text-caption">
                                  {JSON.stringify(d.payload, null, 2)}
                                </pre>
                              </div>
                              <div className="grid content-start gap-1.5">
                                <span className="text-caption font-semibold tracking-[0.04em] text-fg-muted uppercase">
                                  {t('wh2.response')}
                                </span>
                                {d.error && <p className="text-small text-danger-fg">{d.error}</p>}
                                <pre className="max-h-72 overflow-auto rounded-md bg-surface p-3 font-mono text-caption">
                                  {d.responseBody || '—'}
                                </pre>
                                {d.nextAttemptAt && (
                                  <p className="text-caption text-fg-muted">
                                    {t('wh2.nextAttempt', {
                                      at: formatDate(d.nextAttemptAt, intl, true),
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Send />}
              title={t('wh2.noDeliveries')}
              description={t('wh2.noDeliveriesBody')}
            />
          )}
          {total > 0 && <Pagination page={page} limit={limit} total={total} />}
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader title={t('wh2.events')} />
            <CardBody className="flex flex-wrap gap-1.5 pt-4">
              {hook.events.map((e) => (
                <Badge key={e} tone="neutral" className="font-mono">
                  {e}
                </Badge>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('wh2.signing')} description={t('wh2.signingHint')} />
            <CardBody className="grid gap-3 pt-4">
              <code className="block rounded-md bg-surface-muted px-3 py-2 font-mono text-caption break-all">
                X-Shop-Signature: t=…,v1=HMAC-SHA256(secret, &quot;t.body&quot;)
              </code>
              {canWrite && (
                <Confirm
                  trigger={
                    <Button variant="secondary" size="sm" className="justify-self-start">
                      <KeyRound />
                      {t('wh2.rotate')}
                    </Button>
                  }
                  title={t('wh2.rotateTitle')}
                  description={t('wh2.rotateBody')}
                  confirmLabel={t('wh2.rotate')}
                  cancelLabel={t('common.cancel')}
                  onConfirm={async () => {
                    const r = await runAction(rotateWebhookSecret(hook.id));
                    if (r) setSecret(r.secret);
                    return !!r;
                  }}
                />
              )}
            </CardBody>
          </Card>
          {canWrite && (
            <Confirm
              trigger={
                <Button variant="ghost" className="justify-self-start text-danger-fg">
                  <Trash2 />
                  {t('wh2.delete')}
                </Button>
              }
              title={t('cms.deleteTitle', { title: hook.name })}
              description={t('wh2.deleteBody')}
              confirmLabel={t('common.delete')}
              cancelLabel={t('common.cancel')}
              onConfirm={async () => {
                const ok = await runAction(deleteWebhook(hook.id), { success: t('cms.deleted') });
                if (ok !== undefined) router.push('/webhooks');
                return ok !== undefined;
              }}
            />
          )}
        </div>
      </div>
      {editing && <WebhookSheet hook={hook} events={events} onClose={() => setEditing(false)} />}
      {secret && (
        <SecretDialog
          name={hook.name}
          secret={secret}
          hint={t('wh2.secretHint')}
          title={t('wh2.secretTitle', { name: hook.name })}
          onClose={() => setSecret(null)}
        />
      )}
    </>
  );
}
