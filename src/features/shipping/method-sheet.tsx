'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import { toMajor, toMinor } from '@/lib/money';
import type { Schemas } from '@/server/api';
import { LocaleSwitcher, type ShopLocale } from '../catalog/locale-switcher';
import { CODE_PATTERN, codify } from '../catalog/shared';
import { parseCountries } from '../payments/shared';
import { createShippingMethod, deleteShippingMethod, updateShippingMethod } from './actions';

type Method = Schemas['ShippingMethodDto'];
const STANDARD = '__standard';

export function ShippingMethodSheet({
  method,
  websiteId,
  currencies,
  locales,
  taxClasses,
  onClose,
}: {
  method: Method | null;
  websiteId: string;
  /** Currencies sold on the website (rates are per currency). */
  currencies: string[];
  locales: ShopLocale[];
  taxClasses: Schemas['TaxClassDto'][];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = !!method;
  const defaultLocale = locales[0]?.code ?? 'en-US';
  const [names, setNames] = useState<Record<string, { name: string; description: string }>>(
    Object.fromEntries(
      (method?.translations ?? []).map((x) => [
        x.localeCode,
        { name: x.name, description: x.description ?? '' },
      ]),
    ),
  );
  const [locale, setLocale] = useState(defaultLocale);
  const [code, setCode] = useState(method?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(editing);
  const [carrier, setCarrier] = useState(method?.carrier ?? '');
  const [rateType, setRateType] = useState<'FLAT' | 'PER_ITEM'>(method?.rateType ?? 'FLAT');
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(
      currencies.map((c) => [c, method?.amounts[c] != null ? toMajor(method.amounts[c], c) : '']),
    ),
  );
  const [freeOver, setFreeOver] = useState<Record<string, string>>(
    Object.fromEntries(
      currencies.map((c) => [
        c,
        method?.freeOver?.[c] != null ? toMajor(method.freeOver[c], c) : '',
      ]),
    ),
  );
  const [countries, setCountries] = useState((method?.countryCodes ?? []).join(', '));
  const [taxClassId, setTaxClassId] = useState(method?.taxClassId ?? STANDARD);
  const [position, setPosition] = useState(String(method?.position ?? 0));
  const [isActive, setIsActive] = useState(method?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const tr = names[locale] ?? { name: '', description: '' };
  const parsedCountries = parseCountries(countries);
  const money = (m: Record<string, string>) =>
    Object.entries(m)
      .filter(([, v]) => v.trim())
      .map(([c, v]) => [c, toMinor(v, c)] as const);
  const amountList = money(amounts);
  const freeList = money(freeOver);
  const errors = {
    name: !names[defaultLocale]?.name.trim() ? t('ship.err.name') : undefined,
    code: !CODE_PATTERN.test(code) ? t('attr.err.code') : undefined,
    carrier: !carrier.trim() ? t('ship.err.carrier') : undefined,
    amounts: !amountList.length
      ? t('shipm.err.noAmount')
      : [...amountList, ...freeList].some(([, v]) => !(v >= 0))
        ? t('price.err.amount')
        : undefined,
    countries: parsedCountries.invalid.length ? t('tax.err.country') : undefined,
    position: !/^\d{1,4}$/.test(position) ? t('price.err.priority') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) {
      if (errors.name) setLocale(defaultLocale);
      return;
    }
    setSaving(true);
    const body = {
      carrier: carrier.trim(),
      rateType,
      amounts: Object.fromEntries(amountList),
      freeOver: freeList.length ? Object.fromEntries(freeList) : null,
      countryCodes: parsedCountries.codes,
      taxClassId: taxClassId === STANDARD ? null : taxClassId,
      position: Number(position),
      isActive,
      translations: Object.entries(names)
        .filter(([, v]) => v.name.trim())
        .map(([localeCode, v]) => ({
          localeCode,
          name: v.name.trim(),
          ...(v.description.trim() ? { description: v.description.trim() } : {}),
        })),
    };
    const ok = editing
      ? await runAction(
          updateShippingMethod(method.id, body as Schemas['UpdateShippingMethodDto']),
          { success: t('common.saved') },
        )
      : await runAction(
          createShippingMethod({ ...body, websiteId, code } as Schemas['CreateShippingMethodDto']),
          { success: t('shipm.created') },
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
        width="lg"
        title={editing ? names[defaultLocale]?.name || method.code : t('shipm.new')}
        description={t('shipm.sheetHint')}
        footer={
          <>
            {editing && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('shipm.deleteTitle')}
                description={t('shipm.deleteBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteShippingMethod(method.id), {
                    success: t('shipm.deleted'),
                  });
                  if (ok !== undefined) {
                    onClose();
                    router.refresh();
                  }
                  return ok !== undefined;
                }}
              />
            )}
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          <div className="grid gap-4 rounded-lg border border-border p-4">
            <LocaleSwitcher
              locales={locales}
              value={locale}
              onChange={setLocale}
              missing={locales.map((l) => l.code).filter((c) => !names[c]?.name.trim())}
            />
            <Field
              id="sm-name"
              label={`${t('common.name')} · ${locale}`}
              required={locale === defaultLocale}
              error={touched && locale === defaultLocale ? errors.name : undefined}
            >
              <Input
                id="sm-name"
                autoFocus
                value={tr.name}
                placeholder={t('shipm.namePlaceholder')}
                onChange={(e) => {
                  setNames((x) => ({ ...x, [locale]: { ...tr, name: e.target.value } }));
                  if (!codeEdited && locale === defaultLocale) setCode(codify(e.target.value));
                }}
              />
            </Field>
            <Field id="sm-desc" label={t('cat.descriptionField')} hint={t('shipm.descHint')}>
              <Textarea
                id="sm-desc"
                rows={2}
                value={tr.description}
                onChange={(e) =>
                  setNames((x) => ({ ...x, [locale]: { ...tr, description: e.target.value } }))
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="sm-code"
              label={t('common.code')}
              required
              hint={editing ? t('attr.codeLocked') : undefined}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="sm-code"
                value={code}
                disabled={editing}
                className="font-mono"
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
            <Field
              id="sm-carrier"
              label={t('ship.carrier')}
              required
              error={touched ? errors.carrier : undefined}
            >
              <Input
                id="sm-carrier"
                value={carrier}
                placeholder="UPS, GHN…"
                onChange={(e) => setCarrier(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-2">
            <Label>{t('shipm.rateType')}</Label>
            <RadioGroup
              value={rateType}
              onValueChange={(v) => setRateType(v as 'FLAT' | 'PER_ITEM')}
              className="flex flex-wrap gap-6"
            >
              <Radio id="sm-flat" value="FLAT" label={t('shipm.flat')} hint={t('shipm.flatHint')} />
              <Radio
                id="sm-item"
                value="PER_ITEM"
                label={t('shipm.perItem')}
                hint={t('shipm.perItemHint')}
              />
            </RadioGroup>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 text-caption font-semibold tracking-[0.04em] text-fg-muted uppercase">
              <span>{rateType === 'FLAT' ? t('shipm.price') : t('shipm.pricePerItem')}</span>
              <span>{t('shipm.freeOver')}</span>
            </div>
            {currencies.map((c) => (
              <div key={c} className="grid grid-cols-2 gap-3">
                <MoneyInput
                  aria-label={`${t('shipm.price')} ${c}`}
                  currency={c}
                  value={amounts[c] ?? ''}
                  onChange={(e) => setAmounts((m) => ({ ...m, [c]: e.target.value }))}
                />
                <MoneyInput
                  aria-label={`${t('shipm.freeOver')} ${c}`}
                  currency={c}
                  placeholder={t('common.optional')}
                  value={freeOver[c] ?? ''}
                  onChange={(e) => setFreeOver((m) => ({ ...m, [c]: e.target.value }))}
                />
              </div>
            ))}
            {touched && errors.amounts && (
              <p className="text-small text-danger-fg">{errors.amounts}</p>
            )}
            <p className="text-small text-fg-muted">{t('shipm.amountsHint')}</p>
          </div>
          <Field
            id="sm-countries"
            label={t('shipm.countries')}
            hint={t('pay.countriesHint')}
            error={touched ? errors.countries : undefined}
          >
            <Input
              id="sm-countries"
              value={countries}
              placeholder="US, CA"
              onChange={(e) => setCountries(e.target.value)}
              className="font-mono uppercase"
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="grid content-start gap-1.5 sm:col-span-2">
              <Label htmlFor="sm-tax">{t('prod.taxClass')}</Label>
              <Select value={taxClassId} onValueChange={setTaxClassId}>
                <SelectTrigger id="sm-tax" />
                <SelectContent>
                  <SelectItem value={STANDARD}>{t('prod.taxStandard')}</SelectItem>
                  {taxClasses
                    .filter((c) => c.type === 'PRODUCT' && c.code !== 'standard')
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              id="sm-position"
              label={t('common.position')}
              error={touched ? errors.position : undefined}
            >
              <Input
                id="sm-position"
                inputMode="numeric"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="tabular"
              />
            </Field>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
            <span className="text-body font-medium text-fg">{t('common.active')}</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
