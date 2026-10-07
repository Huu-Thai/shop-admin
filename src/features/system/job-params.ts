/**
 * Parameter forms of the shop's job types (imports, exports, maintenance). Job parameters are a
 * free JSON object on the API; known types get a typed form here, unknown types (added by a buyer
 * in the shop) fall back to a JSON editor. Pure: shared by server pages and client forms.
 */
import type { MessageKey } from '@/i18n';

export type FieldKind =
  | 'priceBook'
  | 'source'
  | 'store'
  | 'website'
  | 'storeIds'
  | 'websiteIds'
  | 'date'
  | 'hours'
  | 'orderStatus'
  | 'entityType'
  | 'boolean'
  | 'text';

export interface ParamField {
  key: string;
  kind: FieldKind;
  label: MessageKey;
  hint?: MessageKey;
  required?: boolean;
  /** Label of the empty choice of a select (default: all). */
  any?: MessageKey;
}

export const JOB_FIELDS: Record<string, ParamField[]> = {
  'import.products': [],
  'import.prices': [
    {
      key: 'priceBook',
      kind: 'priceBook',
      label: 'price.book',
      hint: 'job.p.priceBookImport',
      any: 'job.p.fromFile',
    },
  ],
  'import.stock': [
    {
      key: 'source',
      kind: 'source',
      label: 'job.p.source',
      hint: 'job.p.sourceImport',
      any: 'job.p.fromFile',
    },
  ],
  'export.products': [],
  'export.prices': [
    { key: 'priceBook', kind: 'priceBook', label: 'price.book', hint: 'job.p.allBooks' },
  ],
  'export.stock': [
    { key: 'source', kind: 'source', label: 'job.p.source', hint: 'job.p.allSources' },
  ],
  'export.orders': [
    { key: 'from', kind: 'date', label: 'audit.from' },
    { key: 'to', kind: 'date', label: 'audit.to' },
    { key: 'sinceHours', kind: 'hours', label: 'job.p.sinceHours', hint: 'job.p.sinceHoursHint' },
    { key: 'store', kind: 'store', label: 'stores.store' },
    { key: 'status', kind: 'orderStatus', label: 'common.status' },
  ],
  'export.customers': [
    { key: 'website', kind: 'website', label: 'cust.website' },
    { key: 'acceptsMarketing', kind: 'boolean', label: 'job.p.marketingOnly' },
  ],
  'export.audit-log': [
    { key: 'from', kind: 'date', label: 'audit.from', required: true },
    { key: 'to', kind: 'date', label: 'audit.to', required: true },
    { key: 'entityType', kind: 'entityType', label: 'audit.entity' },
    { key: 'action', kind: 'text', label: 'audit.action', hint: 'job.p.actionHint' },
  ],
  'url-rewrites.rebuild': [
    { key: 'storeIds', kind: 'storeIds', label: 'job.p.stores', hint: 'job.p.allStoresHint' },
  ],
  'search.reindex': [
    {
      key: 'websiteIds',
      kind: 'websiteIds',
      label: 'job.p.websites',
      hint: 'job.p.allWebsitesHint',
    },
  ],
  'prices.reindex': [],
};

export type FormValue = string | boolean | string[];

/**
 * Builds API params from form values: empty fields are left out, dates become ISO instants (start
 * of day for `from`, end of day for `to`), hours become integers. Returns the keys that are missing.
 */
export function buildParams(
  fields: ParamField[],
  form: Record<string, FormValue>,
): { params: Record<string, unknown>; missing: string[]; invalid: string[] } {
  const params: Record<string, unknown> = {};
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const f of fields) {
    const v = form[f.key];
    const empty = v === undefined || v === '' || v === false || (Array.isArray(v) && !v.length);
    if (empty) {
      if (f.required) missing.push(f.key);
      continue;
    }
    switch (f.kind) {
      case 'date': {
        const d = new Date(`${v as string}T${f.key === 'to' ? '23:59:59.999' : '00:00:00'}`);
        if (Number.isNaN(d.getTime())) invalid.push(f.key);
        else params[f.key] = d.toISOString();
        break;
      }
      case 'hours': {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 24 * 366) invalid.push(f.key);
        else params[f.key] = n;
        break;
      }
      default:
        params[f.key] = v;
    }
  }
  if (typeof params.from === 'string' && typeof params.to === 'string' && params.from >= params.to)
    invalid.push('to');
  return { params, missing, invalid };
}

/** CSV templates of the imports: the header and one example row. */
export function importTemplate(type: string, locales: string[]): string | null {
  const loc = locales.length ? locales : ['en-US'];
  switch (type) {
    case 'import.products': {
      const texts = loc.flatMap((l) => [
        `name[${l}]`,
        `short_description[${l}]`,
        `description[${l}]`,
      ]);
      const header = [
        'sku',
        'type',
        'status',
        'visibility',
        'attribute_set',
        'weight_grams',
        'websites',
        ...texts,
      ];
      const example = [
        'TEE-NEW-01',
        'SIMPLE',
        'ENABLED',
        'CATALOG_SEARCH',
        'default',
        '180',
        'us',
        ...loc.flatMap(() => ['Classic tee', 'Soft cotton tee', '<p>Our everyday tee.</p>']),
      ];
      return `${header.join(',')}\n${example.map(csvCell).join(',')}\n`;
    }
    case 'import.prices':
      return 'sku,price_book,min_qty,price,compare_at_price\nTEE-NEW-01,us-retail,1,24.00,29.00\n';
    case 'import.stock':
      return 'sku,source,quantity,safety_stock\nTEE-NEW-01,main,50,2\n';
    default:
      return null;
  }
}

/** Quotes a CSV cell when needed (commas, quotes, line breaks). */
export function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Human cron presets; anything else is shown as typed. */
export const CRON_PRESETS: { cron: string; label: MessageKey }[] = [
  { cron: '0 * * * *', label: 'job.cron.hourly' },
  { cron: '0 2 * * *', label: 'job.cron.daily' },
  { cron: '0 2 * * 1', label: 'job.cron.weekly' },
  { cron: '0 2 1 * *', label: 'job.cron.monthly' },
];

/** A five-field cron expression (the shop validates ranges). */
export const CRON = /^(\S+\s+){4}\S+$/;

export const EXECUTION_STATUSES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED'] as const;

export const JOB_TABS: { href: string; label: MessageKey }[] = [
  { href: '/jobs', label: 'job.activity' },
  { href: '/jobs/import', label: 'job.import' },
  { href: '/jobs/export', label: 'job.export' },
  { href: '/jobs/scheduled', label: 'job.scheduled' },
];

/** Saved params → form values (the inverse of `buildParams`, dates as local yyyy-mm-dd). */
export function formFromParams(
  fields: ParamField[],
  params: Record<string, unknown>,
): Record<string, FormValue> {
  const out: Record<string, FormValue> = {};
  for (const f of fields) {
    const v = params[f.key];
    if (v === undefined || v === null) continue;
    if (f.kind === 'date' && typeof v === 'string') {
      const d = new Date(v);
      const pad = (n: number) => String(n).padStart(2, '0');
      out[f.key] = Number.isNaN(d.getTime())
        ? ''
        : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } else if (Array.isArray(v)) out[f.key] = v.map(String);
    else if (typeof v === 'boolean') out[f.key] = v;
    else out[f.key] = String(v);
  }
  return out;
}

/**
 * Admin wording for the shop's job types (`job.type.<type>.title|desc`), falling back to the
 * API's English text for types this admin doesn't know (e.g. added by a buyer in the shop).
 */
export function localizeJobTypes<T extends { type: string; title: string; description: string }>(
  types: T[],
  t: (key: MessageKey) => string,
): T[] {
  const pick = (key: string, fallback: string) => {
    const text = t(key as MessageKey);
    return text === key ? fallback : text;
  };
  return types.map((x) => ({
    ...x,
    title: pick(`job.type.${x.type}.title`, x.title),
    description: pick(`job.type.${x.type}.desc`, x.description),
  }));
}
