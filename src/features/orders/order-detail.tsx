'use client';

import {
  Ban,
  Banknote,
  CircleDollarSign,
  ExternalLink,
  Lock,
  PackageCheck,
  Truck,
  Undo2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Checkbox } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { addOrderNote, cancelOrder, capturePayment, markDelivered } from './actions';
import { openToShip, refundable } from './order-math';
import { RefundDialog } from './refund-dialog';
import { ShipDialog } from './ship-dialog';
import { StatusBadge } from './status';

type Order = Schemas['AdminOrderDto'];
type Item = Schemas['OrderItemDto'];

function Address({ a }: { a: Schemas['CartAddressViewDto'] | null }) {
  const { t } = useI18n();
  if (!a) return <p className="text-small text-fg-muted">{t('order.noAddress')}</p>;
  return (
    <address className="grid gap-0.5 text-body text-fg not-italic">
      <span className="font-medium">
        {a.firstName} {a.lastName}
      </span>
      {a.company && <span>{a.company}</span>}
      <span>{a.line1}</span>
      {a.line2 && <span>{a.line2}</span>}
      <span>{[a.city, a.regionCode, a.postcode].filter(Boolean).join(', ')}</span>
      <span className="font-mono text-small text-fg-muted">{a.countryCode}</span>
      {a.phone && <span className="text-small text-fg-muted">{a.phone}</span>}
    </address>
  );
}

function ItemRows({ items, depth = 0 }: { items: Item[]; depth?: number }) {
  const { t } = useI18n();
  return (
    <>
      {items.map((l) => (
        <FragmentRow key={l.id} item={l} depth={depth}>
          {l.children.length > 0 && <ItemRows items={l.children} depth={depth + 1} />}
        </FragmentRow>
      ))}
    </>
  );

  function FragmentRow({
    item: l,
    depth: d,
    children,
  }: {
    item: Item;
    depth: number;
    children?: React.ReactNode;
  }) {
    const opts = Object.entries(l.options ?? {}).filter(
      ([, v]) => typeof v === 'string' || typeof v === 'number',
    );
    return (
      <>
        <TR className={d ? 'bg-surface-muted/40' : undefined}>
          <TD>
            <span className="block font-medium" style={{ paddingLeft: d * 20 }}>
              {d > 0 && <span className="mr-1.5 text-fg-subtle">↳</span>}
              {l.name}
            </span>
            <span
              className="block font-mono text-caption text-fg-muted"
              style={{ paddingLeft: d * 20 }}
            >
              {l.sku}
              {opts.length > 0 && ` · ${opts.map(([k, v]) => `${k}: ${v}`).join(' · ')}`}
            </span>
          </TD>
          <TD data-align="right">{l.unitPrice.formatted}</TD>
          <TD data-align="right">{l.quantity}</TD>
          <TD data-align="right" className="hidden md:table-cell">
            <span
              className={cn(
                l.qtyShipped >= l.quantity
                  ? 'text-success-fg'
                  : l.qtyShipped
                    ? 'text-info-fg'
                    : 'text-fg-subtle',
              )}
            >
              {l.qtyShipped}
            </span>
            {l.qtyRefunded > 0 && (
              <span className="ml-2 text-caption text-danger-fg" title={t('order.refundedQty')}>
                −{l.qtyRefunded}
              </span>
            )}
          </TD>
          <TD data-align="right" className="font-medium">
            {l.rowTotal.formatted}
            {l.discount.amount > 0 && (
              <span className="block text-caption font-normal text-success-fg">
                −{l.discount.formatted}
              </span>
            )}
          </TD>
        </TR>
        {children}
      </>
    );
  }
}

export function OrderDetail({
  order,
  payments,
  storeName,
  carriers,
  canWrite,
}: {
  order: Order;
  payments: Schemas['OrderPaymentsDto'];
  storeName: string;
  carriers: string[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [dialog, setDialog] = useState<'ship' | 'refund' | null>(null);
  const [note, setNote] = useState('');
  const [notePublic, setNotePublic] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const canShip =
    canWrite &&
    order.status !== 'CANCELED' &&
    order.status !== 'CLOSED' &&
    order.items.some((l) => openToShip(l) > 0);
  const canRefund = canWrite && refundable(order.totals) > 0;
  const canCancel =
    canWrite && order.status === 'PENDING_PAYMENT' && order.items.every((l) => l.qtyShipped === 0);
  const tot = order.totals;
  const totals: [string, string, string?][] = [
    [t('order.subtotal'), tot.subtotal.formatted],
    ...(tot.discount.amount
      ? ([[t('order.discount'), `−${tot.discount.formatted}`, 'text-success-fg']] as [
          string,
          string,
          string,
        ][])
      : []),
    [t('order.shipping'), tot.shipping.formatted],
    [tot.pricesIncludeTax ? t('order.taxIncluded') : t('order.tax'), tot.tax.formatted],
    ...(tot.loyalty.amount
      ? ([[t('order.loyalty'), `−${tot.loyalty.formatted}`, 'text-success-fg']] as [
          string,
          string,
          string,
        ][])
      : []),
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('nav.sales') },
          { label: t('orders.title'), href: '/orders' },
          { label: order.number },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{order.number}</span>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} kind="payment" />
            <StatusBadge status={order.fulfillmentStatus} kind="fulfillment" />
          </span>
        }
        description={t('order.placedAt', {
          at: formatDate(order.placedAt, intl, true),
          store: storeName,
        })}
        actions={
          <>
            {canCancel && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="text-danger-fg">
                    <Ban />
                    {t('order.cancel')}
                  </Button>
                }
                title={t('order.cancelTitle', { number: order.number })}
                description={
                  <span className="grid gap-3">
                    {t('order.cancelBody')}
                    <Textarea
                      aria-label={t('refund.reason')}
                      placeholder={t('order.cancelReason')}
                      rows={2}
                      maxLength={500}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </span>
                }
                confirmLabel={t('order.cancel')}
                cancelLabel={t('common.close')}
                onConfirm={async () => {
                  const ok = await runAction(
                    cancelOrder(order.id, cancelReason.trim() || undefined),
                    { success: t('order.cancelled') },
                  );
                  if (ok) router.refresh();
                  return !!ok;
                }}
              />
            )}
            {canRefund && (
              <Button variant="secondary" onClick={() => setDialog('refund')}>
                <Undo2 />
                {t('order.refund')}
              </Button>
            )}
            {canShip && (
              <Button onClick={() => setDialog('ship')}>
                <Truck />
                {t('order.ship')}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Card className="overflow-hidden">
            <CardHeader title={t('order.items')} />
            <div className="mt-4">
              <Table>
                <THead>
                  <tr>
                    <TH>{t('prod.product')}</TH>
                    <TH data-align="right">{t('order.unitPrice')}</TH>
                    <TH data-align="right">{t('order.qty')}</TH>
                    <TH data-align="right" className="hidden md:table-cell">
                      {t('order.shipped')}
                    </TH>
                    <TH data-align="right">{t('order.total')}</TH>
                  </tr>
                </THead>
                <TBody>
                  <ItemRows items={order.items} />
                </TBody>
              </Table>
            </div>
            <CardBody className="border-t border-border">
              <dl className="ml-auto grid max-w-sm gap-2 text-body">
                {totals.map(([k, v, cls]) => (
                  <div key={k} className="flex justify-between gap-6">
                    <dt className="text-fg-muted">{k}</dt>
                    <dd className={cn('tabular', cls)}>{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-6 border-t border-border pt-2 text-body-lg font-semibold">
                  <dt>{t('order.total')}</dt>
                  <dd className="tabular">{tot.grandTotal.formatted}</dd>
                </div>
                <div className="flex justify-between gap-6 text-small">
                  <dt className="text-fg-muted">{t('order.paid')}</dt>
                  <dd className="tabular">{tot.amountPaid.formatted}</dd>
                </div>
                {tot.amountRefunded.amount > 0 && (
                  <div className="flex justify-between gap-6 text-small">
                    <dt className="text-fg-muted">{t('order.refunded')}</dt>
                    <dd className="tabular text-danger-fg">−{tot.amountRefunded.formatted}</dd>
                  </div>
                )}
                {tot.amountDue.amount - tot.amountPaid.amount > 0 &&
                  order.status !== 'CANCELED' && (
                    <div className="flex justify-between gap-6 text-small font-medium text-warning-fg">
                      <dt>{t('order.due')}</dt>
                      <dd className="tabular">{tot.amountDue.formatted}</dd>
                    </div>
                  )}
              </dl>
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title={t('order.payments')} />
            <CardBody className="grid gap-3 pt-4">
              {payments.payments.length === 0 && (
                <p className="text-small text-fg-muted">{t('order.noPayments')}</p>
              )}
              {payments.payments.map((p) => (
                <div key={p.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
                      <CircleDollarSign className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {p.provider}
                        {p.method && <span className="ml-1.5 text-fg-muted">· {p.method}</span>}
                      </span>
                      <span className="block text-caption text-fg-muted">
                        {formatDate(p.createdAt, intl, true)}
                        {p.providerRef && <span className="ml-1.5 font-mono">{p.providerRef}</span>}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="tabular block font-semibold">{p.amount.formatted}</span>
                      {p.amountRefunded.amount > 0 && (
                        <span className="tabular block text-caption text-danger-fg">
                          −{p.amountRefunded.formatted}
                        </span>
                      )}
                    </span>
                    <StatusBadge status={p.status} kind="record" />
                  </div>
                  {p.failureReason && (
                    <p className="mt-2 text-small text-danger-fg">{p.failureReason}</p>
                  )}
                  {canWrite && p.status === 'AWAITING_COLLECTION' && (
                    <div className="mt-3">
                      <Confirm
                        destructive={false}
                        trigger={
                          <Button size="sm">
                            <Banknote />
                            {t('order.collected')}
                          </Button>
                        }
                        title={t('order.collectedTitle', { amount: p.amount.formatted })}
                        description={t('order.collectedBody')}
                        confirmLabel={t('order.collected')}
                        cancelLabel={t('common.cancel')}
                        onConfirm={async () => {
                          const ok = await runAction(capturePayment(p.id), {
                            success: t('order.captured'),
                          });
                          if (ok) router.refresh();
                          return !!ok;
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {payments.refunds.length > 0 && (
                <div className="grid gap-2">
                  <h3 className="mt-2 text-overline font-semibold tracking-[0.08em] text-fg-subtle uppercase">
                    {t('order.refunds')}
                  </h3>
                  {payments.refunds.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 rounded-md bg-surface-muted/60 px-4 py-2.5 text-small"
                    >
                      <Undo2 aria-hidden className="size-4 text-fg-muted" />
                      <span className="tabular font-semibold text-danger-fg">
                        −{r.amount.formatted}
                      </span>
                      <Badge
                        tone={
                          r.status === 'SUCCEEDED'
                            ? 'success'
                            : r.status === 'FAILED'
                              ? 'danger'
                              : 'warning'
                        }
                        dot
                      >
                        {t(`refund.status.${r.status}` as MessageKey)}
                      </Badge>
                      {r.restock && <Badge tone="outline">{t('refund.restocked')}</Badge>}
                      <span className="min-w-0 flex-1 truncate text-fg-muted">
                        {r.reason ?? r.failureReason ?? ''}
                      </span>
                      <span className="text-caption text-fg-muted">
                        {formatDate(r.createdAt, intl, true)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title={t('order.shipments')} />
            <CardBody className="grid gap-3 pt-4">
              {order.shipments.length === 0 && (
                <p className="text-small text-fg-muted">{t('order.noShipments')}</p>
              )}
              {order.shipments.map((s) => (
                <div key={s.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-md bg-surface-muted text-fg-muted">
                      {s.status === 'DELIVERED' ? (
                        <PackageCheck className="size-4" />
                      ) : (
                        <Truck className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        <span className="font-mono">{s.number}</span> · {s.carrier}
                      </span>
                      <span className="block text-caption text-fg-muted">
                        {t('order.shippedAt', { at: formatDate(s.shippedAt, intl, true) })}
                        {s.deliveredAt &&
                          ` · ${t('order.deliveredAt', { at: formatDate(s.deliveredAt, intl, true) })}`}
                      </span>
                    </span>
                    {s.trackingNumber &&
                      (s.trackingUrl ? (
                        <a
                          href={s.trackingUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="focus-ring inline-flex items-center gap-1 rounded-xs font-mono text-small text-info-fg hover:underline"
                        >
                          {s.trackingNumber}
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <span className="font-mono text-small">{s.trackingNumber}</span>
                      ))}
                    <Badge tone={s.status === 'DELIVERED' ? 'success' : 'info'} dot>
                      {t(`shipment.${s.status}` as MessageKey)}
                    </Badge>
                    {canWrite && s.status === 'SHIPPED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          if (
                            await runAction(markDelivered(s.id), { success: t('order.delivered') })
                          )
                            router.refresh();
                        }}
                      >
                        <PackageCheck />
                        {t('order.markDelivered')}
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-small text-fg-muted">
                    {s.items.map((i) => `${i.quantity} × ${i.sku}`).join(' · ')}
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('order.timeline')} />
            <CardBody className="grid gap-5 pt-4">
              {canWrite && (
                <form
                  className="grid gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!note.trim()) return;
                    setSavingNote(true);
                    const ok = await runAction(addOrderNote(order.id, note.trim(), notePublic));
                    setSavingNote(false);
                    if (ok !== undefined) {
                      setNote('');
                      setNotePublic(false);
                      toast.success(t('order.noteAdded'));
                      router.refresh();
                    }
                  }}
                >
                  <Textarea
                    aria-label={t('order.addNote')}
                    placeholder={t('order.notePlaceholder')}
                    rows={2}
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-small text-fg-muted">
                      <Checkbox
                        checked={notePublic}
                        onCheckedChange={(v) => setNotePublic(v === true)}
                      />
                      {t('order.notePublic')}
                    </label>
                    <Button type="submit" size="sm" loading={savingNote} disabled={!note.trim()}>
                      {t('order.addNote')}
                    </Button>
                  </div>
                </form>
              )}
              <ol className="relative grid gap-4 border-l border-border pl-5">
                {[...order.history].reverse().map((h, i) => (
                  <li key={i} className="relative">
                    <span
                      aria-hidden
                      className={cn(
                        'absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-surface',
                        h.event === 'note' ? 'bg-info' : 'bg-ink-400',
                      )}
                    />
                    <p className="text-body text-fg">{h.message}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-fg-muted">
                      {formatDate(h.createdAt, intl, true)}
                      {h.actorLabel && <span>· {h.actorLabel}</span>}
                      {h.event === 'note' &&
                        (h.isPublic ? (
                          <Badge tone="info">{t('order.visibleToCustomer')}</Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="size-3" />
                            {t('order.internal')}
                          </span>
                        ))}
                    </p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-6 xl:sticky xl:top-[calc(var(--header-height)+24px)]">
          <Card>
            <CardHeader title={t('order.customer')} />
            <CardBody className="grid gap-1 pt-4 text-body">
              <a
                href={`mailto:${order.email}`}
                className="focus-ring truncate rounded-xs text-info-fg hover:underline"
              >
                {order.email}
              </a>
              <span className="text-small text-fg-muted">
                {order.customerId ? t('order.registered') : t('order.guest')} ·{' '}
                {order.customerGroupCode}
              </span>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('order.shippingAddress')} />
            <CardBody className="grid gap-3 pt-4">
              <Address a={order.shippingAddress} />
              {order.shippingMethod && (
                <p className="flex items-center gap-2 text-small text-fg-muted">
                  <Truck className="size-4" />
                  {order.shippingMethod}
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('order.billingAddress')} />
            <CardBody className="pt-4">
              <Address a={order.billingAddress} />
            </CardBody>
          </Card>
          {(order.couponCode || order.promotions.length > 0 || order.loyaltyPoints > 0) && (
            <Card>
              <CardHeader title={t('order.discounts')} />
              <CardBody className="grid gap-2 pt-4 text-small">
                {order.couponCode && (
                  <p>
                    {t('order.coupon')}{' '}
                    <Badge tone="outline" className="ml-1 font-mono">
                      {order.couponCode}
                    </Badge>
                  </p>
                )}
                {order.promotions.map((p, i) => (
                  <p key={i} className="flex justify-between gap-3">
                    <span>{p.label}</span>
                    <span className="tabular text-success-fg">−{p.discount.formatted}</span>
                  </p>
                ))}
                {order.loyaltyPoints > 0 && <p>{t('order.points', { n: order.loyaltyPoints })}</p>}
              </CardBody>
            </Card>
          )}
          {(order.invoices.length > 0 || order.creditMemos.length > 0) && (
            <Card>
              <CardHeader title={t('order.documents')} />
              <CardBody className="grid gap-2 pt-4 text-small">
                {order.invoices.map((d) => (
                  <p key={d.number} className="flex justify-between gap-3">
                    <span>
                      {t('order.invoice')} <span className="font-mono">{d.number}</span>
                    </span>
                    <span className="tabular">{d.amount.formatted}</span>
                  </p>
                ))}
                {order.creditMemos.map((d) => (
                  <p key={d.number} className="flex justify-between gap-3">
                    <span>
                      {t('order.creditMemo')} <span className="font-mono">{d.number}</span>
                    </span>
                    <span className="tabular text-danger-fg">−{d.amount.formatted}</span>
                  </p>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      {dialog === 'ship' && (
        <ShipDialog order={order} carriers={carriers} onClose={() => setDialog(null)} />
      )}
      {dialog === 'refund' && <RefundDialog order={order} onClose={() => setDialog(null)} />}
    </>
  );
}
