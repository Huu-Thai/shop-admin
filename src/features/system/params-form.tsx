'use client';

import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import type { Schemas } from '@/server/api';
import { ORDER_STATUSES } from '../orders/tones';
import { ENTITY_TYPES } from './audit';
import type { FormValue, ParamField } from './job-params';

export interface JobRefs {
  priceBooks: Schemas['PriceBookDto'][];
  sources: Schemas['InventorySourceDto'][];
  stores: Schemas['StoreDto'][];
  websites: Schemas['WebsiteDto'][];
}

const ANY = '__any';

/** Typed fields of a job's parameters; `fields === undefined` means unknown type (JSON). */
export function ParamsForm({
  idPrefix,
  fields,
  value,
  onChange,
  refs,
  errors = [],
  json,
  onJson,
  jsonError,
}: {
  idPrefix: string;
  fields: ParamField[] | undefined;
  value: Record<string, FormValue>;
  onChange: (value: Record<string, FormValue>) => void;
  refs: JobRefs;
  /** Keys that are missing or invalid. */
  errors?: string[];
  json: string;
  onJson: (text: string) => void;
  jsonError?: string;
}) {
  const { t } = useI18n();
  if (!fields)
    return (
      <Field
        id={`${idPrefix}-json`}
        label={t('job.paramsJson')}
        hint={t('job.paramsJsonHint')}
        error={jsonError}
      >
        <Textarea
          id={`${idPrefix}-json`}
          rows={5}
          className="font-mono text-small"
          value={json}
          onChange={(e) => onJson(e.target.value)}
        />
      </Field>
    );
  if (!fields.length) return <p className="text-small text-fg-muted">{t('job.noParams')}</p>;

  const set = (key: string, v: FormValue) => onChange({ ...value, [key]: v });
  const err = (f: ParamField) =>
    errors.includes(f.key)
      ? f.required && !value[f.key]
        ? t('job.err.required')
        : t('job.err.invalid')
      : undefined;
  const select = (
    f: ParamField,
    options: { value: string; label: string }[],
    anyLabel: MessageKey,
  ) => (
    <div key={f.key} className="grid content-start gap-1.5">
      <Label htmlFor={`${idPrefix}-${f.key}`}>{t(f.label)}</Label>
      <Select
        value={(value[f.key] as string) || ANY}
        onValueChange={(v) => set(f.key, v === ANY ? '' : v)}
      >
        <SelectTrigger id={`${idPrefix}-${f.key}`} />
        <SelectContent>
          <SelectItem value={ANY}>{t(f.any ?? anyLabel)}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {f.hint && <p className="text-small text-fg-muted">{t(f.hint)}</p>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        switch (f.kind) {
          case 'priceBook':
            return select(
              f,
              refs.priceBooks.map((b) => ({
                value: b.code,
                label: `${b.name} · ${b.currencyCode}`,
              })),
              'job.p.all',
            );
          case 'source':
            return select(
              f,
              refs.sources.map((s) => ({ value: s.code, label: s.name })),
              'job.p.all',
            );
          case 'store':
            return select(
              f,
              refs.stores.map((s) => ({ value: s.code, label: s.name })),
              'price.allStores',
            );
          case 'website':
            return select(
              f,
              refs.websites.map((w) => ({ value: w.code, label: w.name })),
              'common.allWebsites',
            );
          case 'orderStatus':
            return select(
              f,
              ORDER_STATUSES.map((s) => ({ value: s, label: t(`ostatus.${s}` as MessageKey) })),
              'orders.anyStatus',
            );
          case 'entityType':
            return select(
              f,
              ENTITY_TYPES.map((e) => ({ value: e, label: e.replace(/_/g, ' ') })),
              'audit.anyEntity',
            );
          case 'storeIds':
          case 'websiteIds': {
            const list = f.kind === 'storeIds' ? refs.stores : refs.websites;
            return (
              <div key={f.key} className="grid content-start gap-1.5 sm:col-span-2">
                <Label htmlFor={id}>{t(f.label)}</Label>
                <Combobox
                  id={id}
                  multiple
                  value={(value[f.key] as string[]) ?? []}
                  onChange={(v) => set(f.key, v)}
                  options={list.map((x) => ({ value: x.id, label: x.name, hint: x.code }))}
                  placeholder={t(f.hint ?? 'common.select')}
                  searchPlaceholder={t('common.search')}
                  emptyText={t('common.noResults')}
                />
              </div>
            );
          }
          case 'boolean':
            return (
              <label
                key={f.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5 sm:col-span-2"
              >
                <span className="text-body">{t(f.label)}</span>
                <Switch checked={value[f.key] === true} onCheckedChange={(on) => set(f.key, on)} />
              </label>
            );
          default:
            return (
              <Field
                key={f.key}
                id={id}
                label={t(f.label)}
                required={f.required}
                hint={f.hint ? t(f.hint) : undefined}
                error={err(f)}
              >
                <Input
                  id={id}
                  type={f.kind === 'date' ? 'date' : 'text'}
                  inputMode={f.kind === 'hours' ? 'numeric' : undefined}
                  className={f.kind === 'text' ? 'font-mono' : undefined}
                  value={(value[f.key] as string) ?? ''}
                  onChange={(e) =>
                    set(
                      f.key,
                      f.kind === 'hours' ? e.target.value.replace(/\D/g, '') : e.target.value,
                    )
                  }
                />
              </Field>
            );
        }
      })}
    </div>
  );
}

/** Parses the JSON fallback: an object, or an error message key. */
export function parseJsonParams(text: string): {
  params?: Record<string, unknown>;
  error?: MessageKey;
} {
  if (!text.trim()) return { params: {} };
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v)
      ? { params: v }
      : { error: 'job.err.json' };
  } catch {
    return { error: 'job.err.json' };
  }
}
