'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { type BundleDraft, type GiftCardDraft, openAmountCurrency } from './product-draft';

export function BundleOptionsFields({
  value,
  onChange,
  disabled,
}: {
  value: BundleDraft;
  onChange: (v: BundleDraft) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label>{t('bundle.priceType')}</Label>
        <RadioGroup
          value={value.priceType}
          disabled={disabled}
          onValueChange={(v) => onChange({ ...value, priceType: v as BundleDraft['priceType'] })}
        >
          <Radio
            id="bundle-dynamic"
            value="DYNAMIC"
            label={t('bundle.dynamic')}
            hint={t('bundle.dynamicHint')}
          />
          <Radio
            id="bundle-fixed"
            value="FIXED"
            label={t('bundle.fixed')}
            hint={t('bundle.fixedHint')}
          />
        </RadioGroup>
      </div>
      <div className="grid gap-2">
        <Label>{t('bundle.shipment')}</Label>
        <RadioGroup
          value={value.shipmentType}
          disabled={disabled}
          onValueChange={(v) =>
            onChange({ ...value, shipmentType: v as BundleDraft['shipmentType'] })
          }
        >
          <Radio id="bundle-together" value="TOGETHER" label={t('bundle.together')} />
          <Radio id="bundle-separately" value="SEPARATELY" label={t('bundle.separately')} />
        </RadioGroup>
      </div>
    </div>
  );
}

export function GiftCardFields({
  value,
  onChange,
  currencies,
  defaultCurrency,
  errors,
  disabled,
}: {
  value: GiftCardDraft;
  onChange: (v: GiftCardDraft) => void;
  currencies: string[];
  defaultCurrency: string;
  errors: Record<string, string>;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const err = (k: string) => (errors[k] ? t(errors[k] as MessageKey) : undefined);
  const openCur = openAmountCurrency(value, defaultCurrency);
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label>{t('gc.cardType')}</Label>
        <RadioGroup
          className="flex flex-wrap gap-6"
          value={value.cardType}
          disabled={disabled}
          onValueChange={(v) => onChange({ ...value, cardType: v as GiftCardDraft['cardType'] })}
        >
          <Radio
            id="gc-virtual"
            value="VIRTUAL"
            label={t('gc.virtual')}
            hint={t('gc.virtualHint')}
          />
          <Radio
            id="gc-physical"
            value="PHYSICAL"
            label={t('gc.physical')}
            hint={t('gc.physicalHint')}
          />
        </RadioGroup>
      </div>

      <div className="grid gap-2">
        <Label>{t('gc.amounts')}</Label>
        <p className="-mt-1 text-small text-fg-muted">{t('gc.amountsHint')}</p>
        <ul className="grid gap-2">
          {value.amounts.map((a, i) => (
            <li key={i} className="grid gap-1">
              <div className="flex items-center gap-2">
                <Select
                  value={a.currency}
                  disabled={disabled}
                  onValueChange={(c) =>
                    onChange({
                      ...value,
                      amounts: value.amounts.map((x, j) => (j === i ? { ...x, currency: c } : x)),
                    })
                  }
                >
                  <SelectTrigger aria-label={t('gc.currency')} className="w-24 font-mono" />
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  aria-label={`${t('gc.amount')} ${i + 1}`}
                  inputMode="decimal"
                  value={a.amount}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      amounts: value.amounts.map((x, j) =>
                        j === i ? { ...x, amount: e.target.value } : x,
                      ),
                    })
                  }
                  aria-invalid={!!err(`gc.amount.${i}`) || undefined}
                  className="tabular max-w-40"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('common.remove')}
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...value, amounts: value.amounts.filter((_, j) => j !== i) })
                  }
                >
                  <X />
                </Button>
              </div>
              {err(`gc.amount.${i}`) && (
                <p className="text-small text-danger-fg">{err(`gc.amount.${i}`)}</p>
              )}
            </li>
          ))}
        </ul>
        {err('gc.amounts') && (
          <p role="alert" className="text-small text-danger-fg">
            {err('gc.amounts')}
          </p>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="justify-self-start"
          disabled={disabled}
          onClick={() =>
            onChange({
              ...value,
              amounts: [
                ...value.amounts,
                { currency: value.amounts.at(-1)?.currency ?? defaultCurrency, amount: '' },
              ],
            })
          }
        >
          <Plus />
          {t('gc.addAmount')}
        </Button>
      </div>

      <div className="grid gap-3">
        <label className="flex items-center justify-between gap-4">
          <span className="grid gap-0.5">
            <span className="text-body font-medium text-fg">{t('gc.open')}</span>
            <span className="text-small text-fg-muted">{t('gc.openHint')}</span>
          </span>
          <Switch
            checked={value.allowOpenAmount}
            disabled={disabled}
            onCheckedChange={(v) => onChange({ ...value, allowOpenAmount: v })}
          />
        </label>
        {value.allowOpenAmount && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="gc-min" label={`${t('gc.min')} (${openCur})`} error={err('gc.open')}>
              <Input
                id="gc-min"
                inputMode="decimal"
                value={value.openAmountMin}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, openAmountMin: e.target.value })}
                className="tabular"
              />
            </Field>
            <Field id="gc-max" label={`${t('gc.max')} (${openCur})`}>
              <Input
                id="gc-max"
                inputMode="decimal"
                value={value.openAmountMax}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, openAmountMax: e.target.value })}
                className="tabular"
              />
            </Field>
          </div>
        )}
      </div>

      <Field
        id="gc-lifetime"
        label={t('gc.lifetime')}
        hint={t('gc.lifetimeHint')}
        error={err('gc.lifetime')}
      >
        <Input
          id="gc-lifetime"
          inputMode="numeric"
          value={value.lifetimeDays}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, lifetimeDays: e.target.value })}
          className="tabular max-w-40"
        />
      </Field>
    </div>
  );
}
