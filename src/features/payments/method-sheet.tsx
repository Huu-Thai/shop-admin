'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import {
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
} from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import { toMajor, toMinor } from '@/lib/money';
import type { Schemas } from '@/server/api';
import { CODE_PATTERN, codify } from '../catalog/shared';
import { LocaleSwitcher, type ShopLocale } from '../catalog/locale-switcher';
import { createMethod, deleteMethod, updateMethod } from './actions';
import { parseCountries } from './shared';

type Method = Schemas['StoreMethodDto'];

const toMap = (m: Record<string, number> | null | undefined, currencies: string[]) =>
  Object.fromEntries(currencies.map((c) => [c, m?.[c] != null ? toMajor(m[c], c) : '']));
const fromMap = (m: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(m)
      .filter(([, v]) => v.trim())
      .map(([c, v]) => [c, toMinor(v, c)]),
  );

/** How a provider is offered in one store: title, order, limits, countries and currencies. */
export function MethodSheet({
  method,
  store,
  providers,
  locales,
  onClose,
}: {
  method: Method | null;
  store: Schemas['StoreDto'];
  providers: Schemas['ProviderDto'][];
  locales: ShopLocale[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = !!method;
  const storeLocales = locales.filter((l) => store.localeCodes.includes(l.code));
  const defaultLocale = store.defaultLocaleCode;
  const [providerId, setProviderId] = useState(method?.providerId ?? providers[0]?.id ?? '');
  const [code, setCode] = useState(method?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(editing);
  const [titles, setTitles] = useState<Record<string, { title: string; description: string }>>(
    Object.fromEntries(
      (method?.titles ?? []).map((x) => [
        x.localeCode,
        { title: x.title, description: x.description ?? '' },
      ]),
    ),
  );
  const [locale, setLocale] = useState(defaultLocale);
  const [currencies, setCurrencies] = useState<string[]>(method?.currencyCodes ?? []);
  const [countries, setCountries] = useState((method?.countryCodes ?? []).join(', '));
  const [min, setMin] = useState(toMap(method?.minAmounts, store.currencyCodes));
  const [max, setMax] = useState(toMap(method?.maxAmounts, store.currencyCodes));
  const [position, setPosition] = useState(String(method?.position ?? 0));
  const [isActive, setIsActive] = useState(method?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const tr = titles[locale] ?? { title: '', description: '' };
  const parsedCountries = parseCountries(countries);
  const badMoney = [...Object.entries(min), ...Object.entries(max)].some(
    ([c, v]) => v.trim() && !(toMinor(v, c) >= 0),
  );
  const errors = {
    provider: !providerId ? t('pay.err.provider') : undefined,
    code: !CODE_PATTERN.test(code) ? t('attr.err.code') : undefined,
    title: !titles[defaultLocale]?.title.trim() ? t('pay.err.title') : undefined,
    countries: parsedCountries.invalid.length ? t('tax.err.country') : undefined,
    money: badMoney ? t('price.err.amount') : undefined,
    position: !/^\d{1,4}$/.test(position) ? t('price.err.priority') : undefined,
  };

  const limit = (m: Record<string, number>) =>
    Object.keys(m).length ? m : editing ? null : undefined;

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) {
      if (errors.title) setLocale(defaultLocale);
      return;
    }
    setSaving(true);
    const body = {
      titles: Object.entries(titles)
        .filter(([, v]) => v.title.trim())
        .map(([localeCode, v]) => ({
          localeCode,
          title: v.title.trim(),
          ...(v.description.trim() ? { description: v.description.trim() } : {}),
        })),
      currencyCodes: currencies,
      countryCodes: parsedCountries.codes,
      // The API wants a non-empty map, or null for "no limit" (omitted when creating).
      minAmounts: limit(fromMap(min)),
      maxAmounts: limit(fromMap(max)),
      position: Number(position),
      isActive,
    };
    const ok = editing
      ? await runAction(
          updateMethod(method.id, body as unknown as Schemas['UpdateStoreMethodDto']),
          { success: t('common.saved') },
        )
      : await runAction(
          createMethod({
            ...body,
            storeId: store.id,
            providerId,
            code,
          } as unknown as Schemas['CreateStoreMethodDto']),
          {
            success: t('pay.methodCreated'),
          },
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
        title={editing ? titles[defaultLocale]?.title || method.code : t('pay.newMethod')}
        description={t('pay.methodHint', { store: store.name })}
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
                title={t('pay.deleteMethod')}
                description={t('pay.deleteMethodBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteMethod(method.id), {
                    success: t('pay.methodDeleted'),
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="pm-provider">{t('pay.provider')}</Label>
              <Select value={providerId} onValueChange={setProviderId} disabled={editing}>
                <SelectTrigger
                  id="pm-provider"
                  aria-invalid={(touched && !!errors.provider) || undefined}
                />
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              id="pm-code"
              label={t('common.code')}
              required
              hint={editing ? t('attr.codeLocked') : t('pay.codeHint')}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="pm-code"
                value={code}
                disabled={editing}
                className="font-mono"
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
          </div>

          <div className="grid gap-4 rounded-lg border border-border p-4">
            <LocaleSwitcher
              locales={storeLocales}
              value={locale}
              onChange={setLocale}
              missing={storeLocales.map((l) => l.code).filter((c) => !titles[c]?.title.trim())}
            />
            <Field
              id="pm-title"
              label={`${t('pay.checkoutTitle')} · ${locale}`}
              required={locale === defaultLocale}
              error={touched && locale === defaultLocale ? errors.title : undefined}
            >
              <Input
                id="pm-title"
                value={tr.title}
                placeholder={t('pay.titlePlaceholder')}
                onChange={(e) => {
                  setTitles((x) => ({ ...x, [locale]: { ...tr, title: e.target.value } }));
                  if (!codeEdited && locale === defaultLocale) setCode(codify(e.target.value));
                }}
              />
            </Field>
            <Field id="pm-desc" label={t('cat.descriptionField')}>
              <Textarea
                id="pm-desc"
                rows={2}
                value={tr.description}
                onChange={(e) =>
                  setTitles((x) => ({ ...x, [locale]: { ...tr, description: e.target.value } }))
                }
              />
            </Field>
          </div>

          <div className="grid gap-2">
            <Label>{t('pay.currencies')}</Label>
            <div className="flex flex-wrap gap-4">
              {store.currencyCodes.map((c) => (
                <label key={c} className="flex items-center gap-2 font-mono text-body">
                  <Checkbox
                    checked={currencies.includes(c)}
                    onCheckedChange={(v) =>
                      setCurrencies((x) => (v ? [...x, c] : x.filter((y) => y !== c)))
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
            <p className="text-small text-fg-muted">{t('pay.currenciesHint')}</p>
          </div>

          <Field
            id="pm-countries"
            label={t('pay.countries')}
            hint={t('pay.countriesHint')}
            error={touched ? errors.countries : undefined}
          >
            <Input
              id="pm-countries"
              value={countries}
              placeholder="US, CA"
              onChange={(e) => setCountries(e.target.value)}
              className="font-mono uppercase"
            />
          </Field>

          <div className="grid gap-3">
            <Label>{t('pay.limits')}</Label>
            {store.currencyCodes.map((c) => (
              <div key={c} className="grid grid-cols-2 gap-3">
                <MoneyInput
                  aria-label={`${t('gc.min')} ${c}`}
                  currency={c}
                  placeholder={t('gc.min')}
                  value={min[c] ?? ''}
                  onChange={(e) => setMin((m) => ({ ...m, [c]: e.target.value }))}
                />
                <MoneyInput
                  aria-label={`${t('gc.max')} ${c}`}
                  currency={c}
                  placeholder={t('gc.max')}
                  value={max[c] ?? ''}
                  onChange={(e) => setMax((m) => ({ ...m, [c]: e.target.value }))}
                />
              </div>
            ))}
            {touched && errors.money && <p className="text-small text-danger-fg">{errors.money}</p>}
            <p className="text-small text-fg-muted">{t('pay.limitsHint')}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="pm-position"
              label={t('common.position')}
              hint={t('pay.positionHint')}
              error={touched ? errors.position : undefined}
            >
              <Input
                id="pm-position"
                inputMode="numeric"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="tabular"
              />
            </Field>
            <label className="flex items-center justify-between gap-4 self-end rounded-md border border-border px-4 py-2.5">
              <span className="text-body font-medium text-fg">{t('common.active')}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
