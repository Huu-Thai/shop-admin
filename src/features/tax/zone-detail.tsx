'use client';

import { Pencil, Percent, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { fromLocalInput, PERCENT_PATTERN, toLocalInput } from '../pricing/shared';
import { createTaxRate, deleteTaxRate, updateTaxRate } from './actions';
import { regionLabel } from './regions';
import { ZoneSheet } from './zone-sheet';

type Rate = Schemas['TaxRateDto'];
type TaxClass = Schemas['TaxClassDto'];
const ANY = '__any';

export function ZoneDetail({
  zone,
  rates,
  classes,
  canWrite,
}: {
  zone: Schemas['TaxZoneDto'];
  rates: Rate[];
  classes: TaxClass[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [editingZone, setEditingZone] = useState(false);
  const [rateSheet, setRateSheet] = useState<Rate | 'new' | null>(null);
  const className = (id: string | null) =>
    id ? (classes.find((c) => c.id === id)?.name ?? '—') : t('tax.anyCustomer');
  const now = new Date();
  const sorted = [...rates].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('nav.catalog') },
          { label: t('tax.title'), href: '/tax' },
          { label: zone.code },
        ]}
        title={zone.name}
        description={
          <span className="flex flex-wrap gap-1.5">
            {zone.regions.map((r, i) => (
              <span
                key={i}
                className="rounded-xs bg-surface-muted px-1.5 py-0.5 font-mono text-caption text-fg"
              >
                {regionLabel(r)}
              </span>
            ))}
            <span className="ml-1 text-small">
              · {zone.rounding === 'LINE' ? t('tax.roundLine') : t('tax.roundTotal')}
            </span>
          </span>
        }
        actions={
          canWrite && (
            <>
              <Button variant="secondary" onClick={() => setEditingZone(true)}>
                <Pencil />
                {t('price.editBook')}
              </Button>
              <Button onClick={() => setRateSheet('new')}>
                <Plus />
                {t('tax.addRate')}
              </Button>
            </>
          )
        }
      />
      <Card className="overflow-hidden">
        <CardHeader title={t('tax.rates')} description={t('tax.ratesHint')} />
        <div className="mt-4">
          {sorted.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>{t('common.name')}</TH>
                  <TH data-align="right">{t('tax.rate')}</TH>
                  <TH>{t('tax.productClass')}</TH>
                  <TH className="hidden md:table-cell">{t('tax.customerClass')}</TH>
                  <TH data-align="right" className="hidden sm:table-cell">
                    {t('price.priority')}
                  </TH>
                  <TH className="hidden lg:table-cell">{t('price.validity')}</TH>
                  <TH className="w-24">
                    <span className="sr-only">{t('list.actions')}</span>
                  </TH>
                </tr>
              </THead>
              <TBody>
                {sorted.map((r) => {
                  const ended = r.validTo && new Date(r.validTo) <= now;
                  const future = new Date(r.validFrom) > now;
                  return (
                    <TR key={r.id} className={ended ? 'opacity-60' : undefined}>
                      <TD>
                        <span className="font-medium">{r.name}</span>
                        {r.isCompound && (
                          <Badge tone="info" className="ml-2">
                            {t('tax.compound')}
                          </Badge>
                        )}
                        {ended && <Badge className="ml-2">{t('price.status.expired')}</Badge>}
                        {future && (
                          <Badge tone="info" className="ml-2">
                            {t('price.status.scheduled')}
                          </Badge>
                        )}
                      </TD>
                      <TD data-align="right" className="font-semibold">
                        {Number(r.rate)}%
                      </TD>
                      <TD>{className(r.productTaxClassId)}</TD>
                      <TD className="hidden text-fg-muted md:table-cell">
                        {className(r.customerTaxClassId)}
                      </TD>
                      <TD data-align="right" className="hidden sm:table-cell">
                        {r.priority}
                      </TD>
                      <TD className="hidden text-small whitespace-nowrap text-fg-muted lg:table-cell">
                        {formatDate(r.validFrom, intl)} –{' '}
                        {r.validTo ? formatDate(r.validTo, intl) : '…'}
                      </TD>
                      <TD data-align="right">
                        {canWrite && (
                          <span className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`${t('common.edit')} · ${r.name}`}
                              onClick={() => setRateSheet(r)}
                            >
                              <Pencil />
                            </Button>
                            <Confirm
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`${t('common.delete')} · ${r.name}`}
                                >
                                  <Trash2 />
                                </Button>
                              }
                              title={t('tax.deleteRate', { name: r.name })}
                              description={t('tax.deleteRateBody')}
                              confirmLabel={t('common.delete')}
                              cancelLabel={t('common.cancel')}
                              onConfirm={async () => {
                                const ok = await runAction(deleteTaxRate(r.id), {
                                  success: t('tax.rateDeleted'),
                                });
                                if (ok !== undefined) router.refresh();
                                return ok !== undefined;
                              }}
                            />
                          </span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Percent />}
              title={t('tax.noRates')}
              description={t('tax.noRatesBody')}
            />
          )}
        </div>
      </Card>
      {editingZone && <ZoneSheet zone={zone} onClose={() => setEditingZone(false)} />}
      {rateSheet && (
        <RateSheet
          zoneId={zone.id}
          rate={rateSheet === 'new' ? null : rateSheet}
          classes={classes}
          onClose={() => setRateSheet(null)}
        />
      )}
    </>
  );
}

function RateSheet({
  zoneId,
  rate,
  classes,
  onClose,
}: {
  zoneId: string;
  rate: Rate | null;
  classes: TaxClass[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = !!rate;
  const productClasses = classes
    .filter((c) => c.type === 'PRODUCT')
    .sort((a, b) => Number(b.code === 'standard') - Number(a.code === 'standard'));
  const customerClasses = classes.filter((c) => c.type === 'CUSTOMER');
  const [name, setName] = useState(rate?.name ?? '');
  const [value, setValue] = useState(rate ? String(Number(rate.rate)) : '');
  const [productClassId, setProductClassId] = useState(
    rate?.productTaxClassId ?? productClasses[0]?.id ?? '',
  );
  const [customerClassId, setCustomerClassId] = useState(rate?.customerTaxClassId ?? ANY);
  const [priority, setPriority] = useState(String(rate?.priority ?? 0));
  const [compound, setCompound] = useState(rate?.isCompound ?? false);
  const [validFrom, setValidFrom] = useState(toLocalInput(rate?.validFrom));
  const [validTo, setValidTo] = useState(toLocalInput(rate?.validTo));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    name: !name.trim() ? t('sets.err.name') : undefined,
    rate: !PERCENT_PATTERN.test(value.trim()) ? t('tax.err.rate') : undefined,
    priority: !/^\d{1,4}$/.test(priority) ? t('price.err.priority') : undefined,
    validTo:
      validFrom && validTo && new Date(validTo) <= new Date(validFrom)
        ? t('price.err.window')
        : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const ok = editing
      ? await runAction(
          updateTaxRate(rate.id, {
            name: name.trim(),
            priority: Number(priority),
            validTo: fromLocalInput(validTo),
          }),
          { success: t('common.saved') },
        )
      : await runAction(
          createTaxRate({
            zoneId,
            name: name.trim(),
            rate: value.trim(),
            productTaxClassId: productClassId,
            customerTaxClassId: customerClassId === ANY ? null : customerClassId,
            priority: Number(priority),
            isCompound: compound,
            ...(validFrom ? { validFrom: fromLocalInput(validFrom) ?? undefined } : {}),
            validTo: fromLocalInput(validTo),
          }),
          { success: t('tax.rateCreated') },
        );
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={editing ? rate.name : t('tax.addRate')}
        description={editing ? t('tax.rateLocked') : t('tax.rateHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field
            id="tr-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="tr-name"
              autoFocus
              value={name}
              placeholder="VAT standard"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="tr-rate"
              label={t('tax.rate')}
              required
              error={touched ? errors.rate : undefined}
            >
              <div className="relative">
                <Input
                  id="tr-rate"
                  inputMode="decimal"
                  value={value}
                  disabled={editing}
                  onChange={(e) => setValue(e.target.value)}
                  className="tabular pr-8 text-right"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-small text-fg-muted">
                  %
                </span>
              </div>
            </Field>
            <Field
              id="tr-priority"
              label={t('price.priority')}
              hint={t('tax.priorityHint')}
              error={touched ? errors.priority : undefined}
            >
              <Input
                id="tr-priority"
                inputMode="numeric"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="tabular"
              />
            </Field>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tr-pc">{t('tax.productClass')}</Label>
            <Select value={productClassId} onValueChange={setProductClassId} disabled={editing}>
              <SelectTrigger id="tr-pc" />
              <SelectContent>
                {productClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tr-cc">{t('tax.customerClass')}</Label>
            <Select value={customerClassId} onValueChange={setCustomerClassId} disabled={editing}>
              <SelectTrigger id="tr-cc" />
              <SelectContent>
                <SelectItem value={ANY}>{t('tax.anyCustomer')}</SelectItem>
                {customerClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
            <span className="grid gap-0.5">
              <span className="text-body font-medium text-fg">{t('tax.compound')}</span>
              <span className="text-small text-fg-muted">{t('tax.compoundHint')}</span>
            </span>
            <Switch checked={compound} onCheckedChange={setCompound} disabled={editing} />
          </label>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="tr-from" label={t('price.validFrom')}>
              <Input
                id="tr-from"
                type="datetime-local"
                value={validFrom}
                disabled={editing}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </Field>
            <Field
              id="tr-to"
              label={t('price.validTo')}
              hint={t('tax.validToHint')}
              error={touched ? errors.validTo : undefined}
            >
              <Input
                id="tr-to"
                type="datetime-local"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
