import { toMajor, toMinor } from '@/lib/money';
import type { Schemas } from '@/server/api';

/**
 * Promotion rules as the editor holds them. One flat shape for every rule type, so switching a
 * rule's type keeps what was typed; `toConditions` / `toActions` build the API's typed rules and
 * report problems per rule and field. Mirrors the shop's `promotion-rules.ts` validation.
 */
export type Condition = Schemas['PromotionDto']['conditions'][number];
export type Action = Schemas['PromotionDto']['actions'][number];

export const CONDITION_TYPES = [
  'subtotal_at_least',
  'item_quantity_at_least',
  'customer_group',
] as const satisfies Condition['type'][];
export const ACTION_TYPES = [
  'percent_off_items',
  'fixed_off_items',
  'percent_off_cart',
  'fixed_off_cart',
  'buy_x_get_y',
  'free_shipping',
] as const satisfies Action['type'][];

export interface ItemFilter {
  skus: string[];
  productIds: string[];
  categoryIds: string[];
}

export interface RuleForm<T extends string = string> {
  key: string;
  type: T;
  /** Major units per currency, as typed. */
  amounts: Record<string, string>;
  percent: string;
  quantity: string;
  maxQuantity: string;
  buy: string;
  get: string;
  groups: string[];
  filter: ItemFilter;
}

export type RuleField =
  'amounts' | 'percent' | 'quantity' | 'maxQuantity' | 'buy' | 'get' | 'groups' | 'filter';
/** Message keys (`rule.err.*`) per field. */
export type RuleErrors = Partial<Record<RuleField, string>>;

/** Which fields a rule type uses (the editor shows only these). */
export const FIELDS: Record<Condition['type'] | Action['type'], RuleField[]> = {
  subtotal_at_least: ['amounts'],
  item_quantity_at_least: ['quantity', 'filter'],
  customer_group: ['groups'],
  percent_off_items: ['percent', 'filter', 'maxQuantity'],
  fixed_off_items: ['amounts', 'filter', 'maxQuantity'],
  percent_off_cart: ['percent'],
  fixed_off_cart: ['amounts'],
  buy_x_get_y: ['buy', 'get', 'percent', 'filter'],
  free_shipping: [],
};

let seq = 0;
const newKey = () => `r${++seq}`;
const emptyFilter = (): ItemFilter => ({ skus: [], productIds: [], categoryIds: [] });

export function blankRule<T extends string>(type: T): RuleForm<T> {
  return {
    key: newKey(),
    type,
    amounts: {},
    percent: type === 'buy_x_get_y' ? '100' : '',
    quantity: '',
    maxQuantity: '',
    buy: '',
    get: '',
    groups: [],
    filter: emptyFilter(),
  };
}

/** Rule from the API → editor form. */
export function fromRule(rule: Condition | Action): RuleForm {
  const f = blankRule(rule.type);
  const r = rule as Record<string, unknown>;
  if (r.amounts)
    f.amounts = Object.fromEntries(
      Object.entries(r.amounts as Record<string, number>).map(([c, v]) => [c, toMajor(v, c)]),
    );
  if (typeof r.percent === 'number') f.percent = String(r.percent);
  for (const k of ['quantity', 'maxQuantity', 'buy', 'get'] as const)
    if (typeof r[k] === 'number') f[k] = String(r[k]);
  if (Array.isArray(r.groups)) f.groups = [...(r.groups as string[])];
  const filter = r.filter as Partial<ItemFilter> | undefined;
  if (filter)
    f.filter = {
      skus: filter.skus ?? [],
      productIds: filter.productIds ?? [],
      categoryIds: filter.categoryIds ?? [],
    };
  return f;
}

const intIn = (v: string, min: number, max: number) =>
  /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max ? Number(v) : undefined;

export function parsePercent(v: string): number | undefined {
  const t = v.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return undefined;
  const n = Number(t);
  return n > 0 && n <= 100 ? n : undefined;
}

export const isFilterEmpty = (f: ItemFilter) =>
  !f.skus.length && !f.productIds.length && !f.categoryIds.length;

/**
 * Builds one API rule from its form, or the problems that block it. `currencies` are the ones the
 * promotion sells in: amount maps need at least one of them filled.
 */
export function toRule(
  form: RuleForm,
  currencies: string[],
): { rule?: Condition | Action; errors: RuleErrors } {
  const errors: RuleErrors = {};
  const fields = FIELDS[form.type as keyof typeof FIELDS] ?? [];
  const out: Record<string, unknown> = { type: form.type };

  if (fields.includes('amounts')) {
    const amounts: Record<string, number> = {};
    let bad = false;
    for (const c of currencies) {
      const v = form.amounts[c]?.trim();
      if (!v) continue;
      const minor = toMinor(v, c);
      if (!Number.isSafeInteger(minor) || minor < 1) bad = true;
      else amounts[c] = minor;
    }
    if (bad) errors.amounts = 'rule.err.amount';
    else if (!Object.keys(amounts).length) errors.amounts = 'rule.err.noAmount';
    out.amounts = amounts;
  }
  if (fields.includes('percent')) {
    const p = parsePercent(form.percent);
    if (p === undefined) errors.percent = 'rule.err.percent';
    out.percent = p;
  }
  if (fields.includes('quantity')) {
    const q = intIn(form.quantity, 1, 10_000);
    if (q === undefined) errors.quantity = 'rule.err.quantity';
    out.quantity = q;
  }
  if (fields.includes('maxQuantity') && form.maxQuantity.trim()) {
    const q = intIn(form.maxQuantity, 1, 10_000);
    if (q === undefined) errors.maxQuantity = 'rule.err.quantity';
    out.maxQuantity = q;
  }
  for (const k of ['buy', 'get'] as const)
    if (fields.includes(k)) {
      const n = intIn(form[k], 1, 1000);
      if (n === undefined) errors[k] = 'rule.err.buyGet';
      out[k] = n;
    }
  if (fields.includes('groups')) {
    if (!form.groups.length) errors.groups = 'rule.err.groups';
    out.groups = [...new Set(form.groups)];
  }
  if (fields.includes('filter')) {
    const f = form.filter;
    if (f.skus.length + f.productIds.length + f.categoryIds.length > 1500)
      errors.filter = 'rule.err.filter';
    if (!isFilterEmpty(f))
      out.filter = Object.fromEntries(
        (['skus', 'productIds', 'categoryIds'] as const)
          .filter((k) => f[k].length)
          .map((k) => [k, [...new Set(f[k])]]),
      );
  }
  return Object.keys(errors).length
    ? { errors }
    : { rule: out as unknown as Condition | Action, errors };
}

/** All rules of a list, or the errors keyed by rule key. */
export function toRules<T extends Condition | Action>(
  forms: RuleForm[],
  currencies: string[],
): { rules: T[]; errors: Record<string, RuleErrors> } {
  const rules: T[] = [];
  const errors: Record<string, RuleErrors> = {};
  for (const f of forms) {
    const r = toRule(f, currencies);
    if (r.rule) rules.push(r.rule as T);
    else errors[f.key] = r.errors;
  }
  return { rules, errors };
}

/** Short text parts describing a rule (for lists): a message key and its parameters. */
export function describe(
  rule: Condition | Action,
  money: (minor: number, currency: string) => string,
): { key: string; params: Record<string, string | number> } {
  const r = rule as Record<string, unknown>;
  const amounts = r.amounts as Record<string, number> | undefined;
  const amount = amounts
    ? Object.entries(amounts)
        .map(([c, v]) => money(v, c))
        .join(' / ')
    : '';
  const scope = r.filter ? 'some' : 'all';
  switch (rule.type) {
    case 'subtotal_at_least':
      return { key: 'rule.d.subtotal', params: { amount } };
    case 'item_quantity_at_least':
      return { key: `rule.d.quantity.${scope}`, params: { n: rule.quantity } };
    case 'customer_group':
      return { key: 'rule.d.groups', params: { groups: rule.groups.join(', ') } };
    case 'percent_off_items':
      return { key: `rule.d.percentItems.${scope}`, params: { percent: rule.percent } };
    case 'fixed_off_items':
      return { key: `rule.d.fixedItems.${scope}`, params: { amount } };
    case 'percent_off_cart':
      return { key: 'rule.d.percentCart', params: { percent: rule.percent } };
    case 'fixed_off_cart':
      return { key: 'rule.d.fixedCart', params: { amount } };
    case 'buy_x_get_y':
      return {
        key: rule.percent === 100 ? 'rule.d.bxgyFree' : 'rule.d.bxgy',
        params: { buy: rule.buy, get: rule.get, percent: rule.percent },
      };
    default:
      return { key: 'rule.d.freeShipping', params: {} };
  }
}
