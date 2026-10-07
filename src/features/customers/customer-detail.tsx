'use client';

import { Ban, LogOut, MapPin, Pencil, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { LoyaltySummary, PointsLedger } from '../loyalty/customer-loyalty';
import { StatusBadge } from '../orders/status';
import { deleteAddress, deleteCustomer, signOutCustomer, updateCustomer } from './actions';
import { AddressDialog } from './address-dialog';
import { CustomerStatus } from './customer-status';
import { fullName } from './shared';

type Customer = Schemas['CustomerDetailDto'];
type Address = Schemas['AddressDto'];
const STORE_LANGUAGE = '__default';

export interface CustomerLoyalty {
  program: Schemas['ProgramDto'];
  account: Schemas['AccountDto'] | null;
  transactions: Schemas['TransactionListDto'];
}

export function CustomerDetail({
  customer: c,
  groups,
  locales,
  websiteName,
  orders,
  loyalty,
  canWrite,
}: {
  customer: Customer;
  groups: Schemas['CustomerGroupDto'][];
  locales: Schemas['LocaleDto'][];
  websiteName: string;
  /** Recent orders, or null without orders:read. */
  orders: { data: Schemas['AdminOrderSummaryDto'][]; total: number } | null;
  /** Null when the website has no loyalty program. */
  loyalty: CustomerLoyalty | null;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const initial = {
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone ?? '',
    localeCode: c.localeCode ?? STORE_LANGUAGE,
    groupCode: c.groupCode,
    acceptsMarketing: c.acceptsMarketing,
  };
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<Address | 'new' | null>(null);
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some(
    (k) => form[k] !== initial[k],
  );
  const errors = {
    firstName: !form.firstName.trim() ? t('cust.err.firstName') : undefined,
    lastName: !form.lastName.trim() ? t('cust.err.lastName') : undefined,
  };
  const name = fullName(c) || c.email;
  const locked = !!c.lockedUntil && new Date(c.lockedUntil) > new Date();

  const save = async () => {
    setTouched(true);
    if (errors.firstName || errors.lastName) return;
    setSaving(true);
    const ok = await runAction(
      updateCustomer(c.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        ...(form.localeCode !== STORE_LANGUAGE ? { localeCode: form.localeCode } : {}),
        groupCode: form.groupCode,
        acceptsMarketing: form.acceptsMarketing,
      }),
      { success: t('common.saved') },
    );
    setSaving(false);
    if (ok) {
      setTouched(false);
      router.refresh();
    }
  };
  // Pick up saved values after the refresh.
  const [base, setBase] = useState(c);
  if (base !== c) {
    setBase(c);
    setForm(initial);
  }

  const setStatus = async (status: 'ACTIVE' | 'DISABLED') => {
    const ok = await runAction(updateCustomer(c.id, { status }), {
      success: status === 'ACTIVE' ? t('cust.enabled') : t('cust.disabled'),
    });
    if (ok) router.refresh();
    return !!ok;
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {name}
            <CustomerStatus status={c.status} lockedUntil={c.lockedUntil} />
          </span>
        }
        description={c.email}
        breadcrumbs={[{ label: t('cust.title'), href: '/customers' }, { label: name }]}
        actions={
          canWrite && (
            <>
              <Confirm
                trigger={
                  <Button variant="secondary">
                    <LogOut />
                    {t('cust.signOut')}
                  </Button>
                }
                destructive={false}
                title={t('cust.signOutTitle')}
                description={t('cust.signOutBody')}
                confirmLabel={t('cust.signOut')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () =>
                  (await runAction(signOutCustomer(c.id), { success: t('cust.signedOut') })) !==
                  undefined
                }
              />
              {c.status === 'ACTIVE' ? (
                <Confirm
                  trigger={
                    <Button variant="secondary">
                      <Ban />
                      {t('cust.disable')}
                    </Button>
                  }
                  title={t('cust.disableTitle')}
                  description={t('cust.disableBody')}
                  confirmLabel={t('cust.disable')}
                  cancelLabel={t('common.cancel')}
                  onConfirm={() => setStatus('DISABLED')}
                />
              ) : (
                <Button variant="secondary" onClick={() => setStatus('ACTIVE')}>
                  <ShieldCheck />
                  {t('cust.enable')}
                </Button>
              )}
            </>
          )
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader title={t('cust.profile')} />
            <CardBody className="grid gap-5 pt-4">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  id="cd-first"
                  label={t('cust.firstName')}
                  required
                  error={touched ? errors.firstName : undefined}
                >
                  <Input
                    id="cd-first"
                    disabled={!canWrite}
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </Field>
                <Field
                  id="cd-last"
                  label={t('cust.lastName')}
                  required
                  error={touched ? errors.lastName : undefined}
                >
                  <Input
                    id="cd-last"
                    disabled={!canWrite}
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </Field>
                <Field id="cd-email" label={t('cust.email')} hint={t('cust.emailLocked')}>
                  <Input id="cd-email" value={c.email} disabled />
                </Field>
                <Field id="cd-phone" label={t('cust.phone')}>
                  <Input
                    id="cd-phone"
                    type="tel"
                    disabled={!canWrite}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Field>
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="cd-group">{t('price.group')}</Label>
                  <Select
                    value={form.groupCode}
                    disabled={!canWrite}
                    onValueChange={(v) => setForm((f) => ({ ...f, groupCode: v }))}
                  >
                    <SelectTrigger id="cd-group" />
                    <SelectContent>
                      {groups
                        .filter((g) => g.code !== 'guest')
                        .map((g) => (
                          <SelectItem key={g.id} value={g.code}>
                            {g.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="cd-locale">{t('common.language')}</Label>
                  <Select
                    value={form.localeCode}
                    disabled={!canWrite}
                    onValueChange={(v) => setForm((f) => ({ ...f, localeCode: v }))}
                  >
                    <SelectTrigger id="cd-locale" />
                    <SelectContent>
                      {!c.localeCode && (
                        <SelectItem value={STORE_LANGUAGE}>{t('cust.storeLanguage')}</SelectItem>
                      )}
                      {locales.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                <span>
                  <span className="block text-body font-medium">{t('cust.marketing')}</span>
                  <span className="block text-small text-fg-muted">{t('cust.marketingHint')}</span>
                </span>
                <Switch
                  disabled={!canWrite}
                  checked={form.acceptsMarketing}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, acceptsMarketing: v }))}
                />
              </label>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t('addr.title')}
              actions={
                canWrite && (
                  <Button size="sm" variant="secondary" onClick={() => setAddress('new')}>
                    <Plus />
                    {t('addr.add')}
                  </Button>
                )
              }
            />
            <CardBody className="pt-4">
              {c.addresses.length ? (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {c.addresses.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-col gap-3 rounded-lg border border-border p-4"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {a.isDefaultShipping && (
                          <Badge tone="info">{t('addr.defaultShippingShort')}</Badge>
                        )}
                        {a.isDefaultBilling && (
                          <Badge tone="neutral">{t('addr.defaultBillingShort')}</Badge>
                        )}
                      </div>
                      <address className="grid gap-0.5 text-body not-italic">
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
                      {canWrite && (
                        <div className="mt-auto flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setAddress(a)}>
                            <Pencil />
                            {t('common.edit')}
                          </Button>
                          <Confirm
                            trigger={
                              <Button size="sm" variant="ghost" className="text-danger-fg">
                                <Trash2 />
                                {t('common.delete')}
                              </Button>
                            }
                            title={t('addr.deleteTitle')}
                            confirmLabel={t('common.delete')}
                            cancelLabel={t('common.cancel')}
                            onConfirm={async () => {
                              const ok = await runAction(deleteAddress(c.id, a.id), {
                                success: t('addr.deleted'),
                              });
                              if (ok !== undefined) router.refresh();
                              return ok !== undefined;
                            }}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<MapPin />}
                  title={t('addr.empty')}
                  description={t('addr.emptyBody')}
                />
              )}
            </CardBody>
          </Card>

          {orders && (
            <Card className="overflow-hidden">
              <CardHeader
                title={t('cust.orders')}
                description={orders.total ? t('cust.ordersCount', { n: orders.total }) : undefined}
                actions={
                  orders.total > 0 && (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/orders?customerId=${c.id}`}>{t('dash.viewAll')}</Link>
                    </Button>
                  )
                }
              />
              <div className="mt-4">
                {orders.data.length ? (
                  <Table>
                    <THead>
                      <tr>
                        <TH>{t('order.number')}</TH>
                        <TH>{t('order.status')}</TH>
                        <TH className="hidden md:table-cell">{t('order.payment')}</TH>
                        <TH data-align="right">{t('order.total')}</TH>
                        <TH data-align="right" className="hidden sm:table-cell">
                          {t('order.placed')}
                        </TH>
                      </tr>
                    </THead>
                    <TBody>
                      {orders.data.map((o) => (
                        <TR key={o.id}>
                          <TD>
                            <Link
                              href={`/orders/${o.id}`}
                              className="focus-ring rounded-xs font-mono text-small font-medium hover:underline"
                            >
                              {o.number}
                            </Link>
                          </TD>
                          <TD>
                            <StatusBadge status={o.status} />
                          </TD>
                          <TD className="hidden md:table-cell">
                            <StatusBadge status={o.paymentStatus} kind="payment" />
                          </TD>
                          <TD data-align="right" className="font-medium">
                            {o.grandTotal.formatted}
                          </TD>
                          <TD
                            data-align="right"
                            className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                          >
                            {formatDate(o.placedAt, intl)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                ) : (
                  <p className="flex items-center gap-2 px-5 pb-5 text-small text-fg-muted">
                    <ShoppingBag aria-hidden className="size-4" />
                    {t('cust.noOrders')}
                  </p>
                )}
              </div>
            </Card>
          )}

          {loyalty && <PointsLedger customerId={c.id} initial={loyalty.transactions} />}
        </div>

        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader title={t('common.details')} />
            <CardBody className="pt-4">
              <dl className="grid gap-3 text-small">
                {[
                  [t('cust.website'), websiteName],
                  [t('cust.joined'), formatDate(c.createdAt, intl)],
                  [
                    t('cust.lastLogin'),
                    c.lastLoginAt ? formatDate(c.lastLoginAt, intl, true) : t('cust.never'),
                  ],
                  ...(locked
                    ? [[t('cust.lockedUntil'), formatDate(c.lockedUntil!, intl, true)]]
                    : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-fg-muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          {loyalty && (
            <LoyaltySummary
              customerId={c.id}
              account={loyalty.account}
              program={loyalty.program}
              canWrite={canWrite}
            />
          )}
          {canWrite && (
            <Card className="border-danger/30">
              <CardHeader title={t('cust.dangerZone')} description={t('cust.deleteHint')} />
              <CardBody className="pt-4">
                <Confirm
                  trigger={
                    <Button variant="danger" className="w-full">
                      <Trash2 />
                      {t('cust.delete')}
                    </Button>
                  }
                  title={t('cust.deleteTitle', { name })}
                  description={t('cust.deleteBody')}
                  confirmLabel={t('cust.delete')}
                  cancelLabel={t('common.cancel')}
                  onConfirm={async () => {
                    const ok = await runAction(deleteCustomer(c.id), {
                      success: t('cust.deleted'),
                    });
                    if (ok !== undefined) router.push('/customers');
                    return ok !== undefined;
                  }}
                />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={() => setForm(initial)}
          message={t('common.unsaved')}
          saveLabel={t('common.save')}
          discardLabel={t('common.discard')}
        />
      )}
      {address && (
        <AddressDialog
          customerId={c.id}
          address={address === 'new' ? null : address}
          defaults={{ firstName: c.firstName, lastName: c.lastName }}
          onClose={() => setAddress(null)}
        />
      )}
    </>
  );
}
