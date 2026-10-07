'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatMoney, formatNumber, fractionDigits } from '@/lib/format';
import { toMajor, toMinor } from '@/lib/money';
import type { Schemas } from '@/server/api';
import { saveProgram } from './actions';

type Program = Schemas['ProgramDto'];
const int = (v: string, min: number, max: number) =>
  /^\d{1,7}$/.test(v) && Number(v) >= min && Number(v) <= max ? Number(v) : undefined;

/** Sets up or edits a website's points program: earn rate, point value, redemption and expiry. */
export function ProgramSheet({
  website,
  program,
  currencies,
  onClose,
}: {
  website: Schemas['WebsiteDto'];
  program: Program | null;
  currencies: string[];
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [name, setName] = useState(program?.name ?? t('loy.defaultName'));
  const [currency, setCurrency] = useState(program?.currencyCode ?? website.baseCurrencyCode);
  const [spend, setSpend] = useState(
    toMajor(Number(program?.spendPerPoint ?? 10 ** fractionDigits(currency)), currency),
  );
  const [value, setValue] = useState(toMajor(Number(program?.pointValue ?? 1), currency));
  const [minRedeem, setMinRedeem] = useState(String(program?.minRedeemPoints ?? 0));
  const [maxPercent, setMaxPercent] = useState(String(program?.maxRedeemPercent ?? 100));
  const [expiry, setExpiry] = useState(
    program?.expiryDays != null ? String(program.expiryDays) : '',
  );
  const [tierWindow, setTierWindow] = useState(String(program?.tierWindowDays ?? 365));
  const [isActive, setIsActive] = useState(program?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const spendMinor = toMinor(spend, currency);
  const valueMinor = toMinor(value, currency);
  const errors = {
    name: !name.trim() ? t('loy.err.name') : undefined,
    spend: !(Number.isSafeInteger(spendMinor) && spendMinor >= 1)
      ? t('price.err.amount')
      : undefined,
    value: !(Number.isSafeInteger(valueMinor) && valueMinor >= 1)
      ? t('price.err.amount')
      : undefined,
    minRedeem: int(minRedeem, 0, 1_000_000) === undefined ? t('rule.err.quantity') : undefined,
    maxPercent: int(maxPercent, 1, 100) === undefined ? t('loy.err.percent') : undefined,
    expiry: expiry && int(expiry, 1, 3650) === undefined ? t('loy.err.days') : undefined,
    window: int(tierWindow, 1, 3650) === undefined ? t('loy.err.days') : undefined,
  };
  // "A $50 order earns 50 points, worth $0.50."
  const sample = 50 * 10 ** fractionDigits(currency);
  const samplePoints = errors.spend ? 0 : Math.floor(sample / spendMinor);

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const ok = await runAction(
      saveProgram(website.id, {
        name: name.trim(),
        currencyCode: currency,
        spendPerPoint: spendMinor,
        pointValue: valueMinor,
        minRedeemPoints: Number(minRedeem),
        maxRedeemPercent: Number(maxPercent),
        expiryDays: expiry ? Number(expiry) : null,
        tierWindowDays: Number(tierWindow),
        isActive,
      }),
      { success: program ? t('common.saved') : t('loy.programCreated') },
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
        title={program ? program.name : t('loy.setUp', { website: website.name })}
        description={t('loy.sheetHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {program ? t('common.save') : t('loy.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_140px]">
            <Field
              id="lp-name"
              label={t('common.name')}
              required
              hint={t('loy.nameHint')}
              error={touched ? errors.name : undefined}
            >
              <Input id="lp-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="lp-currency">{t('gc.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={!!program}>
                <SelectTrigger id="lp-currency" />
                <SelectContent>
                  {[...new Set([currency, ...currencies])].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="grid gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-small font-semibold">{t('loy.earning')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="lp-spend"
                label={t('loy.spendPerPoint')}
                hint={t('loy.spendHint')}
                error={touched ? errors.spend : undefined}
              >
                <MoneyInput
                  id="lp-spend"
                  currency={currency}
                  value={spend}
                  onChange={(e) => setSpend(e.target.value)}
                />
              </Field>
              <Field
                id="lp-window"
                label={t('loy.tierWindow')}
                hint={t('loy.tierWindowHint')}
                error={touched ? errors.window : undefined}
              >
                <Input
                  id="lp-window"
                  inputMode="numeric"
                  className="tabular"
                  value={tierWindow}
                  onChange={(e) => setTierWindow(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-small font-semibold">{t('loy.redeeming')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                id="lp-value"
                label={t('loy.pointValue')}
                error={touched ? errors.value : undefined}
              >
                <MoneyInput
                  id="lp-value"
                  currency={currency}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </Field>
              <Field
                id="lp-min"
                label={t('loy.minRedeem')}
                error={touched ? errors.minRedeem : undefined}
              >
                <Input
                  id="lp-min"
                  inputMode="numeric"
                  className="tabular"
                  value={minRedeem}
                  onChange={(e) => setMinRedeem(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <Field
                id="lp-max"
                label={t('loy.maxPercent')}
                error={touched ? errors.maxPercent : undefined}
              >
                <div className="relative">
                  <Input
                    id="lp-max"
                    inputMode="numeric"
                    className="tabular pr-8"
                    value={maxPercent}
                    onChange={(e) => setMaxPercent(e.target.value.replace(/\D/g, ''))}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-small text-fg-muted">
                    %
                  </span>
                </div>
              </Field>
            </div>
            <Field
              id="lp-expiry"
              label={t('loy.expiryDays')}
              hint={t('loy.expiryHint')}
              error={touched ? errors.expiry : undefined}
            >
              <Input
                id="lp-expiry"
                inputMode="numeric"
                className="tabular max-w-40"
                placeholder={t('loy.never')}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </fieldset>

          {!errors.spend && !errors.value && (
            <p className="rounded-md bg-accent-soft px-4 py-3 text-small text-fg">
              {t('loy.example', {
                order: formatMoney(sample, currency, intl),
                points: formatNumber(samplePoints, intl),
                worth: formatMoney(samplePoints * valueMinor, currency, intl),
              })}
            </p>
          )}

          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('loy.active')}</span>
              <span className="block text-small text-fg-muted">{t('loy.activeHint')}</span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
