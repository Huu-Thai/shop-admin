'use client';

import { Coins, Languages, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { createCurrency, createLocale, updateCurrency, updateLocale } from './actions';
import { CURRENCY_CODE, LOCALE_CODE, STORE_TABS } from './tabs';

type Locale = Schemas['LocaleDto'];
type Currency = Schemas['CurrencyDto'];

function ActiveBadge({ on }: { on: boolean }) {
  const { t } = useI18n();
  return on ? (
    <Badge tone="success" dot>
      {t('common.active')}
    </Badge>
  ) : (
    <Badge tone="neutral">{t('common.inactive')}</Badge>
  );
}

/** Languages content and catalog can be translated into, with fallbacks. */
export function LocalesView({
  locales,
  usedBy,
  canWrite,
}: {
  locales: Locale[];
  /** Locale code → store names that sell in it. */
  usedBy: Record<string, string[]>;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<Locale | 'new' | null>(null);
  const sorted = [...locales].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.code.localeCompare(b.code),
  );
  return (
    <>
      <PageHeader
        title={t('loc.title')}
        description={t('loc.description')}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('nav.stores'), href: '/stores' },
          { label: t('loc.title') },
        ]}
        actions={
          canWrite && (
            <Button onClick={() => setEditing('new')}>
              <Plus />
              {t('loc.new')}
            </Button>
          )
        }
      />
      <SubNav items={STORE_TABS} />
      <Card className="overflow-hidden">
        {sorted.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.name')}</TH>
                <TH>{t('common.code')}</TH>
                <TH className="hidden md:table-cell">{t('loc.fallback')}</TH>
                <TH className="hidden lg:table-cell">{t('loc.usedBy')}</TH>
                <TH>{t('common.status')}</TH>
                <TH data-align="right">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {sorted.map((l) => (
                <TR key={l.code}>
                  <TD className="font-medium" lang={l.code}>
                    {l.name}
                  </TD>
                  <TD className="font-mono text-small">{l.code}</TD>
                  <TD className="hidden font-mono text-small text-fg-muted md:table-cell">
                    {l.fallbackCode ?? '—'}
                  </TD>
                  <TD className="hidden max-w-[320px] truncate text-small text-fg-muted lg:table-cell">
                    {usedBy[l.code]?.join(', ') || '—'}
                  </TD>
                  <TD>
                    <ActiveBadge on={l.isActive} />
                  </TD>
                  <TD data-align="right">
                    {canWrite && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(l)}>
                        {t('common.edit')}
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<Languages />} title={t('loc.empty')} />
        )}
      </Card>
      {editing && (
        <LocaleSheet
          locale={editing === 'new' ? null : editing}
          locales={locales}
          inUse={editing !== 'new' && !!usedBy[editing.code]?.length}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function LocaleSheet({
  locale,
  locales,
  inUse,
  onClose,
}: {
  locale: Locale | null;
  locales: Locale[];
  inUse: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState(locale?.code ?? '');
  const [name, setName] = useState(locale?.name ?? '');
  const [fallback, setFallback] = useState(locale?.fallbackCode ?? '');
  const [isActive, setIsActive] = useState(locale?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    code: !LOCALE_CODE.test(code) ? t('loc.err.code') : undefined,
    name: !name.trim() ? t('site.err.name') : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (errors.code || errors.name) return;
    setSaving(true);
    const body = { name: name.trim(), fallbackCode: fallback || null, isActive };
    const ok = locale
      ? await runAction(updateLocale(locale.code, body), { success: t('common.saved') })
      : await runAction(createLocale({ ...body, code }), { success: t('loc.created') });
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={locale ? locale.name : t('loc.new')}
        description={t('loc.sheetHint')}
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
            id="lc-code"
            label={t('common.code')}
            required
            hint={locale ? t('attr.codeLocked') : t('loc.codeHint')}
            error={touched ? errors.code : undefined}
          >
            <Input
              id="lc-code"
              className="font-mono"
              autoFocus={!locale}
              disabled={!!locale}
              value={code}
              placeholder="fr-FR"
              onChange={(e) => setCode(e.target.value.trim())}
            />
          </Field>
          <Field
            id="lc-name"
            label={t('common.name')}
            required
            hint={t('loc.nameHint')}
            error={touched ? errors.name : undefined}
          >
            <Input
              id="lc-name"
              value={name}
              placeholder="Français (France)"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="grid gap-1.5">
            <Label htmlFor="lc-fallback">{t('loc.fallback')}</Label>
            <Select
              value={fallback || '__none'}
              onValueChange={(v) => setFallback(v === '__none' ? '' : v)}
            >
              <SelectTrigger id="lc-fallback" />
              <SelectContent>
                <SelectItem value="__none">{t('loc.noFallback')}</SelectItem>
                {locales
                  .filter((l) => l.code !== code)
                  .map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name} · {l.code}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-small text-fg-muted">{t('loc.fallbackHint')}</p>
          </div>
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('common.active')}</span>
              <span className="block text-small text-fg-muted">
                {inUse && isActive ? t('loc.inUseHint') : t('loc.activeHint')}
              </span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Currencies stores can sell in. Decimals are fixed once created (amounts are stored in minor units). */
export function CurrenciesView({
  currencies,
  usedBy,
  canWrite,
}: {
  currencies: Currency[];
  usedBy: Record<string, string[]>;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<Currency | 'new' | null>(null);
  const sorted = [...currencies].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.code.localeCompare(b.code),
  );
  return (
    <>
      <PageHeader
        title={t('cur.title')}
        description={t('cur.description')}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('nav.stores'), href: '/stores' },
          { label: t('cur.title') },
        ]}
        actions={
          canWrite && (
            <Button onClick={() => setEditing('new')}>
              <Plus />
              {t('cur.new')}
            </Button>
          )
        }
      />
      <SubNav items={STORE_TABS} />
      <Card className="overflow-hidden">
        {sorted.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.code')}</TH>
                <TH>{t('common.name')}</TH>
                <TH>{t('cur.symbol')}</TH>
                <TH className="hidden md:table-cell" data-align="right">
                  {t('cur.decimals')}
                </TH>
                <TH className="hidden lg:table-cell">{t('loc.usedBy')}</TH>
                <TH>{t('common.status')}</TH>
                <TH data-align="right">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {sorted.map((c) => (
                <TR key={c.code}>
                  <TD className="font-mono text-small font-medium">{c.code}</TD>
                  <TD>{c.name}</TD>
                  <TD>{c.symbol}</TD>
                  <TD className="tabular hidden md:table-cell" data-align="right">
                    {c.minorUnits}
                  </TD>
                  <TD className="hidden max-w-[320px] truncate text-small text-fg-muted lg:table-cell">
                    {usedBy[c.code]?.join(', ') || '—'}
                  </TD>
                  <TD>
                    <ActiveBadge on={c.isActive} />
                  </TD>
                  <TD data-align="right">
                    {canWrite && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                        {t('common.edit')}
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<Coins />} title={t('cur.empty')} />
        )}
      </Card>
      {editing && (
        <CurrencySheet
          currency={editing === 'new' ? null : editing}
          inUse={editing !== 'new' && !!usedBy[editing.code]?.length}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function CurrencySheet({
  currency,
  inUse,
  onClose,
}: {
  currency: Currency | null;
  inUse: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState(currency?.code ?? '');
  const [name, setName] = useState(currency?.name ?? '');
  const [symbol, setSymbol] = useState(currency?.symbol ?? '');
  const [minorUnits, setMinorUnits] = useState(String(currency?.minorUnits ?? 2));
  const [isActive, setIsActive] = useState(currency?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    code: !CURRENCY_CODE.test(code) ? t('cur.err.code') : undefined,
    name: !name.trim() ? t('site.err.name') : undefined,
    symbol: !symbol.trim() ? t('cur.err.symbol') : undefined,
    minorUnits: !/^[0-4]$/.test(minorUnits) ? t('cur.err.decimals') : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const ok = currency
      ? await runAction(
          updateCurrency(currency.code, { name: name.trim(), symbol: symbol.trim(), isActive }),
          {
            success: t('common.saved'),
          },
        )
      : await runAction(
          createCurrency({
            code,
            name: name.trim(),
            symbol: symbol.trim(),
            minorUnits: Number(minorUnits),
            isActive,
          }),
          { success: t('cur.created') },
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
        title={currency ? `${currency.code} · ${currency.name}` : t('cur.new')}
        description={t('cur.sheetHint')}
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="cu-code"
              label={t('common.code')}
              required
              hint={currency ? t('attr.codeLocked') : t('cur.codeHint')}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="cu-code"
                className="font-mono uppercase"
                maxLength={3}
                autoFocus={!currency}
                disabled={!!currency}
                value={code}
                placeholder="EUR"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </Field>
            <Field
              id="cu-decimals"
              label={t('cur.decimals')}
              required
              hint={currency ? t('cur.decimalsLocked') : t('cur.decimalsHint')}
              error={touched ? errors.minorUnits : undefined}
            >
              <Input
                id="cu-decimals"
                inputMode="numeric"
                className="tabular"
                maxLength={1}
                disabled={!!currency}
                value={minorUnits}
                onChange={(e) => setMinorUnits(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
          <Field
            id="cu-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="cu-name"
              value={name}
              placeholder="Euro"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            id="cu-symbol"
            label={t('cur.symbol')}
            required
            error={touched ? errors.symbol : undefined}
          >
            <Input
              id="cu-symbol"
              className="max-w-32"
              value={symbol}
              placeholder="€"
              onChange={(e) => setSymbol(e.target.value)}
            />
          </Field>
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('common.active')}</span>
              <span className="block text-small text-fg-muted">
                {inUse && isActive ? t('cur.inUseHint') : t('cur.activeHint')}
              </span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
