'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { CODE_PATTERN, codify } from '../catalog/shared';
import { createPriceBook, deletePriceBook, updatePriceBook } from './actions';
import { fromLocalInput, toLocalInput } from './shared';

const ANY = '__any';

export interface PricingRefs {
  currencies: Schemas['CurrencyDto'][];
  websites: Schemas['WebsiteDto'][];
  stores: Schemas['StoreDto'][];
  groups: Schemas['CustomerGroupDto'][];
}

export function BookSheet({
  book,
  refs,
  onClose,
}: {
  book: Schemas['PriceBookDto'] | null;
  refs: PricingRefs;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = !!book;
  const [name, setName] = useState(book?.name ?? '');
  const [code, setCode] = useState(book?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(editing);
  const [currency, setCurrency] = useState(
    book?.currencyCode ?? refs.websites[0]?.baseCurrencyCode ?? refs.currencies[0]?.code ?? 'USD',
  );
  const [includesTax, setIncludesTax] = useState(book?.includesTax ?? false);
  const [websiteId, setWebsiteId] = useState(book?.websiteId ?? ANY);
  const [storeId, setStoreId] = useState(book?.storeId ?? ANY);
  const [groupId, setGroupId] = useState(book?.customerGroupId ?? ANY);
  const [priority, setPriority] = useState(String(book?.priority ?? 0));
  const [validFrom, setValidFrom] = useState(toLocalInput(book?.validFrom));
  const [validTo, setValidTo] = useState(toLocalInput(book?.validTo));
  const [isActive, setIsActive] = useState(book?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const stores = refs.stores.filter((s) => websiteId === ANY || s.websiteId === websiteId);
  const errors = {
    name: !name.trim() ? t('sets.err.name') : undefined,
    code: !CODE_PATTERN.test(code) ? t('attr.err.code') : undefined,
    priority: !/^-?\d{1,4}$/.test(priority) ? t('price.err.priority') : undefined,
    validTo:
      validFrom && validTo && new Date(validTo) <= new Date(validFrom)
        ? t('price.err.window')
        : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const common = {
      name: name.trim(),
      websiteId: websiteId === ANY ? null : websiteId,
      storeId: storeId === ANY ? null : storeId,
      customerGroupId: groupId === ANY ? null : groupId,
      priority: Number(priority),
      validFrom: fromLocalInput(validFrom),
      validTo: fromLocalInput(validTo),
      isActive,
    };
    const ok = editing
      ? await runAction(updatePriceBook(book.id, common), { success: t('common.saved') })
      : await runAction(createPriceBook({ ...common, code, currencyCode: currency, includesTax }), {
          success: t('price.bookCreated'),
        });
    setSaving(false);
    if (ok) {
      onClose();
      if (!editing) router.push(`/pricing/books/${ok.id}`);
      else router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={editing ? book.name : t('price.newBook')}
        description={t('price.bookHint')}
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
                title={t('price.deleteBook', { name: book.name })}
                description={t('price.deleteBookBody', { n: book.entryCount })}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deletePriceBook(book.id), {
                    success: t('price.bookDeleted'),
                  });
                  if (ok !== undefined) {
                    onClose();
                    router.push('/pricing');
                  }
                  return ok !== undefined;
                }}
              />
            )}
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? t('common.save') : t('price.createBook')}
            </Button>
          </>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="pb-name"
              label={t('common.name')}
              required
              error={touched ? errors.name : undefined}
            >
              <Input
                id="pb-name"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!codeEdited) setCode(codify(e.target.value));
                }}
              />
            </Field>
            <Field
              id="pb-code"
              label={t('common.code')}
              required
              hint={editing ? t('attr.codeLocked') : undefined}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="pb-code"
                value={code}
                disabled={editing}
                className="font-mono"
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="pb-currency">{t('gc.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={editing}>
                <SelectTrigger id="pb-currency" />
                <SelectContent>
                  {refs.currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editing && <p className="text-small text-fg-muted">{t('price.currencyLocked')}</p>}
            </div>
            <label className="flex items-center justify-between gap-4 self-end rounded-md border border-border px-3 py-2.5">
              <span className="grid gap-0.5">
                <span className="text-body font-medium text-fg">{t('price.includesTax')}</span>
                <span className="text-small text-fg-muted">{t('price.includesTaxHint')}</span>
              </span>
              <Switch checked={includesTax} onCheckedChange={setIncludesTax} disabled={editing} />
            </label>
          </div>

          <fieldset className="grid gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-small font-medium text-fg">{t('price.scope')}</legend>
            <p className="-mt-2 text-small text-fg-muted">{t('price.scopeHint')}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="pb-website">{t('common.websites')}</Label>
                <Select
                  value={websiteId}
                  onValueChange={(v) => {
                    setWebsiteId(v);
                    setStoreId(ANY);
                  }}
                >
                  <SelectTrigger id="pb-website" />
                  <SelectContent>
                    <SelectItem value={ANY}>{t('common.allWebsites')}</SelectItem>
                    {refs.websites.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="pb-store">{t('stores.store')}</Label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger id="pb-store" />
                  <SelectContent>
                    <SelectItem value={ANY}>{t('price.allStores')}</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="pb-group">{t('price.group')}</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger id="pb-group" />
                  <SelectContent>
                    <SelectItem value={ANY}>{t('price.allGroups')}</SelectItem>
                    {refs.groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field
              id="pb-priority"
              label={t('price.priority')}
              hint={t('price.priorityHint')}
              error={touched ? errors.priority : undefined}
            >
              <Input
                id="pb-priority"
                inputMode="numeric"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="tabular"
              />
            </Field>
            <Field id="pb-from" label={t('price.validFrom')}>
              <Input
                id="pb-from"
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </Field>
            <Field
              id="pb-to"
              label={t('price.validTo')}
              error={touched ? errors.validTo : undefined}
            >
              <Input
                id="pb-to"
                type="datetime-local"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </Field>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
            <span className="grid gap-0.5">
              <span className="text-body font-medium text-fg">{t('common.active')}</span>
              <span className="text-small text-fg-muted">{t('price.activeHint')}</span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
