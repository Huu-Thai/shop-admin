'use client';

import { Globe, Pencil, Plus, Star, Store as StoreIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { codify } from '../catalog/shared';
import {
  createStore,
  createWebsite,
  deleteStore,
  deleteWebsite,
  updateStore,
  updateWebsite,
} from './actions';
import { SITE_CODE, STORE_TABS } from './tabs';

type Website = Schemas['WebsiteDto'];
type Store = Schemas['StoreDto'];
type Locale = Schemas['LocaleDto'];
type Currency = Schemas['CurrencyDto'];

/**
 * Websites (a catalog, base currency and customer base) and their stores (a storefront: URL,
 * languages, currencies, country and tax display).
 */
export function WebsitesView({
  websites,
  stores,
  locales,
  currencies,
  canWrite,
}: {
  websites: Website[];
  stores: Store[];
  locales: Locale[];
  currencies: Currency[];
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const [website, setWebsite] = useState<Website | 'new' | null>(null);
  const [store, setStore] = useState<{ websiteId: string; store: Store | null } | null>(null);
  const sorted = [...websites].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name),
  );

  return (
    <>
      <PageHeader
        title={t('nav.stores')}
        description={t('site.description')}
        breadcrumbs={[{ label: t('nav.system') }, { label: t('nav.stores') }]}
        actions={
          canWrite && (
            <Button onClick={() => setWebsite('new')}>
              <Plus />
              {t('site.new')}
            </Button>
          )
        }
      />
      <SubNav items={STORE_TABS} />
      <div className="grid gap-6">
        {sorted.length === 0 && (
          <Card>
            <EmptyState
              icon={<Globe />}
              title={t('site.empty')}
              description={t('site.emptyBody')}
            />
          </Card>
        )}
        {sorted.map((w) => {
          const own = stores
            .filter((s) => s.websiteId === w.id)
            .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
          return (
            <Card key={w.id} className="overflow-hidden">
              <CardHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {w.name}
                    <code className="font-mono text-caption font-normal text-fg-muted">
                      {w.code}
                    </code>
                  </span>
                }
                description={t('site.summary', { currency: w.baseCurrencyCode, n: own.length })}
                actions={
                  <>
                    {w.isActive ? (
                      <Badge tone="success" dot>
                        {t('common.active')}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">{t('common.inactive')}</Badge>
                    )}
                    {canWrite && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setWebsite(w)}>
                          <Pencil />
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setStore({ websiteId: w.id, store: null })}
                        >
                          <Plus />
                          {t('site.addStore')}
                        </Button>
                      </>
                    )}
                  </>
                }
              />
              {own.length ? (
                <div className="mt-4">
                  <Table>
                    <THead>
                      <tr>
                        <TH>{t('stores.store')}</TH>
                        <TH className="hidden md:table-cell">{t('site.languages')}</TH>
                        <TH className="hidden md:table-cell">{t('site.currencies')}</TH>
                        <TH className="hidden lg:table-cell">{t('site.country')}</TH>
                        <TH className="hidden lg:table-cell">{t('site.prices')}</TH>
                        <TH>{t('common.status')}</TH>
                        <TH data-align="right">
                          <span className="sr-only">{t('list.actions')}</span>
                        </TH>
                      </tr>
                    </THead>
                    <TBody>
                      {own.map((s) => (
                        <TR key={s.id}>
                          <TD>
                            <span className="flex items-center gap-1.5 font-medium">
                              {s.name}
                              {w.defaultStoreId === s.id && (
                                <Star
                                  aria-label={t('site.defaultStore')}
                                  className="size-3.5 fill-accent text-accent"
                                />
                              )}
                            </span>
                            <span className="block font-mono text-caption text-fg-muted">
                              {s.code}
                              {s.baseUrl && ` · ${s.baseUrl.replace(/^https?:\/\//, '')}`}
                            </span>
                          </TD>
                          <TD className="hidden md:table-cell">
                            <CodeList codes={s.localeCodes} main={s.defaultLocaleCode} />
                          </TD>
                          <TD className="hidden md:table-cell">
                            <CodeList codes={s.currencyCodes} main={s.defaultCurrencyCode} />
                          </TD>
                          <TD className="hidden font-mono text-small lg:table-cell">
                            {s.countryCode}
                          </TD>
                          <TD className="hidden text-small text-fg-muted lg:table-cell">
                            {s.pricesIncludeTax ? t('site.inclTax') : t('site.exclTax')}
                          </TD>
                          <TD>
                            {s.isActive ? (
                              <Badge tone="success" dot>
                                {t('common.active')}
                              </Badge>
                            ) : (
                              <Badge tone="neutral">{t('common.inactive')}</Badge>
                            )}
                          </TD>
                          <TD data-align="right">
                            {canWrite && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStore({ websiteId: w.id, store: s })}
                              >
                                {t('common.edit')}
                              </Button>
                            )}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={<StoreIcon />}
                  title={t('site.noStores')}
                  description={t('site.noStoresBody')}
                />
              )}
            </Card>
          );
        })}
      </div>
      {website && (
        <WebsiteSheet
          website={website === 'new' ? null : website}
          stores={website === 'new' ? [] : stores.filter((s) => s.websiteId === website.id)}
          currencies={currencies}
          onClose={() => setWebsite(null)}
        />
      )}
      {store && (
        <StoreSheet
          website={websites.find((w) => w.id === store.websiteId)!}
          store={store.store}
          locales={locales}
          currencies={currencies}
          onClose={() => setStore(null)}
        />
      )}
    </>
  );
}

function CodeList({ codes, main }: { codes: string[]; main: string }) {
  const sorted = [main, ...codes.filter((c) => c !== main)];
  return (
    <span className="flex flex-wrap gap-1">
      {sorted.map((c) => (
        <Badge key={c} tone={c === main ? 'accent' : 'neutral'} className="font-mono">
          {c}
        </Badge>
      ))}
    </span>
  );
}

function WebsiteSheet({
  website,
  stores,
  currencies,
  onClose,
}: {
  website: Website | null;
  stores: Store[];
  currencies: Currency[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(website?.name ?? '');
  const [code, setCode] = useState(website?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(!!website);
  const [currency, setCurrency] = useState(
    website?.baseCurrencyCode ?? currencies.find((c) => c.isActive)?.code ?? 'USD',
  );
  const [defaultStore, setDefaultStore] = useState(website?.defaultStoreId ?? '');
  const [position, setPosition] = useState(String(website?.position ?? 0));
  const [isActive, setIsActive] = useState(website?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    name: !name.trim() ? t('site.err.name') : undefined,
    code: !SITE_CODE.test(code) ? t('attr.err.code') : undefined,
    position: !/^\d{1,4}$/.test(position) ? t('price.err.priority') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const ok = website
      ? await runAction(
          updateWebsite(website.id, {
            name: name.trim(),
            baseCurrencyCode: currency,
            defaultStoreId: defaultStore || null,
            position: Number(position),
            isActive,
          }),
          { success: t('common.saved') },
        )
      : await runAction(
          createWebsite({
            code,
            name: name.trim(),
            baseCurrencyCode: currency,
            position: Number(position),
            isActive,
          }),
          { success: t('site.created') },
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
        title={website ? website.name : t('site.new')}
        description={t('site.sheetHint')}
        footer={
          <>
            {website && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('site.deleteTitle', { name: website.name })}
                description={t('site.deleteBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteWebsite(website.id), {
                    success: t('site.deleted'),
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
        <div className="grid gap-5">
          <Field
            id="ws-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="ws-name"
              autoFocus
              value={name}
              placeholder={t('site.namePlaceholder')}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeEdited) setCode(codify(e.target.value));
              }}
            />
          </Field>
          <Field
            id="ws-code"
            label={t('common.code')}
            required
            hint={website ? t('attr.codeLocked') : undefined}
            error={touched ? errors.code : undefined}
          >
            <Input
              id="ws-code"
              className="font-mono"
              disabled={!!website}
              value={code}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(e.target.value.toLowerCase());
              }}
            />
          </Field>
          <div className="grid gap-1.5">
            <Label htmlFor="ws-currency">{t('site.baseCurrency')}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="ws-currency" />
              <SelectContent>
                {currencies
                  .filter((c) => c.isActive || c.code === currency)
                  .map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-small text-fg-muted">{t('site.baseCurrencyHint')}</p>
          </div>
          {website && stores.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="ws-default">{t('site.defaultStore')}</Label>
              <Select
                value={defaultStore || '__none'}
                onValueChange={(v) => setDefaultStore(v === '__none' ? '' : v)}
              >
                <SelectTrigger id="ws-default" />
                <SelectContent>
                  <SelectItem value="__none">{t('site.noDefault')}</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-small text-fg-muted">{t('site.defaultStoreHint')}</p>
            </div>
          )}
          <Field
            id="ws-position"
            label={t('common.position')}
            error={touched ? errors.position : undefined}
          >
            <Input
              id="ws-position"
              inputMode="numeric"
              className="tabular max-w-32"
              value={position}
              onChange={(e) => setPosition(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('common.active')}</span>
              <span className="block text-small text-fg-muted">{t('site.activeHint')}</span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StoreSheet({
  website,
  store,
  locales,
  currencies,
  onClose,
}: {
  website: Website;
  store: Store | null;
  locales: Locale[];
  currencies: Currency[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(store?.name ?? '');
  const [code, setCode] = useState(store?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(!!store);
  const [baseUrl, setBaseUrl] = useState(store?.baseUrl ?? '');
  const [country, setCountry] = useState(store?.countryCode ?? '');
  const [localeCodes, setLocaleCodes] = useState<string[]>(
    store?.localeCodes ??
      locales
        .filter((l) => l.isActive)
        .slice(0, 1)
        .map((l) => l.code),
  );
  const [defaultLocale, setDefaultLocale] = useState(
    store?.defaultLocaleCode ?? localeCodes[0] ?? '',
  );
  const [currencyCodes, setCurrencyCodes] = useState<string[]>(
    store?.currencyCodes ?? [website.baseCurrencyCode],
  );
  const [defaultCurrency, setDefaultCurrency] = useState(
    store?.defaultCurrencyCode ?? website.baseCurrencyCode,
  );
  const [pricesIncludeTax, setPricesIncludeTax] = useState(store?.pricesIncludeTax ?? false);
  const [position, setPosition] = useState(String(store?.position ?? 0));
  const [isActive, setIsActive] = useState(store?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const url = baseUrl.trim();
  const errors = {
    name: !name.trim() ? t('site.err.name') : undefined,
    code: !SITE_CODE.test(code) ? t('attr.err.code') : undefined,
    baseUrl: url && !/^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(url) ? t('site.err.url') : undefined,
    country: !/^[A-Z]{2}$/.test(country) ? t('tax.err.country') : undefined,
    locales: !localeCodes.length ? t('site.err.locales') : undefined,
    currencies: !currencyCodes.length ? t('site.err.currencies') : undefined,
    position: !/^\d{1,4}$/.test(position) ? t('price.err.priority') : undefined,
  };
  // Keep the defaults inside the chosen lists.
  const pickLocales = (v: string[]) => {
    setLocaleCodes(v);
    if (!v.includes(defaultLocale)) setDefaultLocale(v[0] ?? '');
  };
  const pickCurrencies = (v: string[]) => {
    setCurrencyCodes(v);
    if (!v.includes(defaultCurrency)) setDefaultCurrency(v[0] ?? '');
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const body = {
      name: name.trim(),
      baseUrl: url || null,
      countryCode: country,
      defaultLocaleCode: defaultLocale,
      localeCodes,
      defaultCurrencyCode: defaultCurrency,
      currencyCodes,
      pricesIncludeTax,
      position: Number(position),
      isActive,
    };
    const ok = store
      ? await runAction(updateStore(store.id, body), { success: t('common.saved') })
      : await runAction(createStore({ ...body, websiteId: website.id, code }), {
          success: t('site.storeCreated'),
        });
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
        title={store ? store.name : t('site.newStore', { website: website.name })}
        description={t('site.storeHint')}
        footer={
          <>
            {store && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('site.deleteStoreTitle', { name: store.name })}
                description={t('site.deleteStoreBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteStore(store.id), {
                    success: t('site.storeDeleted'),
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
            <Field
              id="st-name"
              label={t('common.name')}
              required
              error={touched ? errors.name : undefined}
            >
              <Input
                id="st-name"
                autoFocus
                value={name}
                placeholder={t('site.storePlaceholder')}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!codeEdited) setCode(codify(e.target.value));
                }}
              />
            </Field>
            <Field
              id="st-code"
              label={t('common.code')}
              required
              hint={store ? t('attr.codeLocked') : t('site.codeHint')}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="st-code"
                className="font-mono"
                disabled={!!store}
                value={code}
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_120px]">
            <Field
              id="st-url"
              label={t('site.baseUrl')}
              hint={t('site.baseUrlHint')}
              error={touched ? errors.baseUrl : undefined}
            >
              <Input
                id="st-url"
                type="url"
                className="font-mono"
                placeholder="https://shop.example.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </Field>
            <Field
              id="st-country"
              label={t('site.country')}
              required
              error={touched ? errors.country : undefined}
            >
              <Input
                id="st-country"
                className="font-mono uppercase"
                maxLength={2}
                placeholder="US"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
              />
            </Field>
          </div>

          <fieldset className="grid gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-small font-semibold">{t('site.languages')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="st-locales">{t('site.sold')}</Label>
                <Combobox
                  id="st-locales"
                  multiple
                  value={localeCodes}
                  onChange={pickLocales}
                  options={locales
                    .filter((l) => l.isActive || localeCodes.includes(l.code))
                    .map((l) => ({ value: l.code, label: l.name, hint: l.code }))}
                  placeholder={t('site.chooseLocales')}
                  searchPlaceholder={t('common.search')}
                  emptyText={t('common.noResults')}
                  invalid={touched && !!errors.locales}
                />
                {touched && errors.locales && (
                  <p className="text-small text-danger-fg">{errors.locales}</p>
                )}
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="st-default-locale">{t('site.default')}</Label>
                <Select
                  value={defaultLocale}
                  onValueChange={setDefaultLocale}
                  disabled={!localeCodes.length}
                >
                  <SelectTrigger id="st-default-locale" />
                  <SelectContent>
                    {localeCodes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {locales.find((l) => l.code === c)?.name ?? c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-small font-semibold">{t('site.currencies')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="st-currencies">{t('site.sold')}</Label>
                <Combobox
                  id="st-currencies"
                  multiple
                  value={currencyCodes}
                  onChange={pickCurrencies}
                  options={currencies
                    .filter((c) => c.isActive || currencyCodes.includes(c.code))
                    .map((c) => ({ value: c.code, label: c.code, hint: c.name }))}
                  placeholder={t('site.chooseCurrencies')}
                  searchPlaceholder={t('common.search')}
                  emptyText={t('common.noResults')}
                  invalid={touched && !!errors.currencies}
                />
                {touched && errors.currencies && (
                  <p className="text-small text-danger-fg">{errors.currencies}</p>
                )}
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="st-default-currency">{t('site.default')}</Label>
                <Select
                  value={defaultCurrency}
                  onValueChange={setDefaultCurrency}
                  disabled={!currencyCodes.length}
                >
                  <SelectTrigger id="st-default-currency" />
                  <SelectContent>
                    {currencyCodes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-small text-fg-muted">
              {t('site.currenciesHint', { base: website.baseCurrencyCode })}
            </p>
          </fieldset>

          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('price.includesTax')}</span>
              <span className="block text-small text-fg-muted">{t('site.pricesHint')}</span>
            </span>
            <Switch checked={pricesIncludeTax} onCheckedChange={setPricesIncludeTax} />
          </label>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="st-position"
              label={t('common.position')}
              error={touched ? errors.position : undefined}
            >
              <Input
                id="st-position"
                inputMode="numeric"
                className="tabular"
                value={position}
                onChange={(e) => setPosition(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <label className="flex items-center justify-between gap-4 self-end rounded-lg border border-border px-4 py-2.5">
              <span className="text-body font-medium">{t('common.active')}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
