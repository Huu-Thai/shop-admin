'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboOption } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlays';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { flatten } from '../catalog/categories/tree';
import { pickLocalized } from '../catalog/shared';
import {
  ACTION_TYPES,
  blankRule,
  CONDITION_TYPES,
  FIELDS,
  type ItemFilter,
  isFilterEmpty,
  type RuleErrors,
  type RuleForm,
} from './rules';

/** Reference data the rule fields need. */
export interface RuleContext {
  currencies: string[];
  groups: Schemas['CustomerGroupDto'][];
  tree: Schemas['CategoryNodeDto'][];
  /** Store locale for product names. */
  nameLocale?: string;
  /** Labels of products already in the rules (id → name). */
  productLabels: Record<string, string>;
}

/** Remote product search: value = id, label = name, hint = SKU. */
export function productSearch(nameLocale?: string) {
  return async (query: string): Promise<ComboOption[]> => {
    const q = new URLSearchParams({ limit: '20', sort: 'sku' });
    if (query) q.set('search', query);
    if (nameLocale) q.set('locale', nameLocale);
    const list = await gw<Schemas['ProductListDto']>(`products?${q}`);
    return list.data.map((p) => ({ value: p.id, label: p.name ?? p.sku, hint: p.sku }));
  };
}

/** Remote variant search where the value is the SKU itself (rules filter by SKU). */
function skuSearch(nameLocale?: string) {
  return async (query: string): Promise<ComboOption[]> => {
    const q = new URLSearchParams({ limit: '20' });
    if (query) q.set('search', query);
    if (nameLocale) q.set('locale', nameLocale);
    const hits = await gw<Schemas['VariantSearchItemDto'][]>(`variants?${q}`);
    return hits.map((h) => ({ value: h.sku, label: h.sku, hint: h.productName ?? h.productSku }));
  };
}

function FilterField({
  id,
  filter,
  onChange,
  ctx,
  error,
}: {
  id: string;
  filter: ItemFilter;
  onChange: (f: ItemFilter) => void;
  ctx: RuleContext;
  error?: string;
}) {
  const { t, locale } = useI18n();
  // "Only some items" stays open while the pickers are still empty.
  const [some, setSome] = useState(!isFilterEmpty(filter));
  const categoryOptions = useMemo(
    () =>
      flatten(ctx.tree).map((f) => ({
        value: f.id,
        label: `${'— '.repeat(f.depth)}${pickLocalized(f.node.translations, locale)?.name ?? '—'}`,
      })),
    [ctx.tree, locale],
  );
  const loadProducts = useMemo(() => productSearch(ctx.nameLocale), [ctx.nameLocale]);
  const loadSkus = useMemo(() => skuSearch(ctx.nameLocale), [ctx.nameLocale]);
  return (
    <div className="grid gap-3">
      <RadioGroup
        value={some ? 'some' : 'all'}
        onValueChange={(v) => {
          setSome(v === 'some');
          if (v === 'all') onChange({ skus: [], productIds: [], categoryIds: [] });
        }}
        className="flex flex-wrap gap-6"
      >
        <Radio id={`${id}-all`} value="all" label={t('rule.everyItem')} />
        <Radio id={`${id}-some`} value="some" label={t('rule.someItems')} />
      </RadioGroup>
      {some && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="grid content-start gap-1.5">
              <Label htmlFor={`${id}-cat`}>{t('rule.categories')}</Label>
              <Combobox
                id={`${id}-cat`}
                multiple
                value={filter.categoryIds}
                onChange={(v) => onChange({ ...filter, categoryIds: v })}
                options={categoryOptions}
                placeholder={t('rule.anyCategory')}
                searchPlaceholder={t('common.search')}
                emptyText={t('common.noResults')}
              />
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor={`${id}-prod`}>{t('nav.products')}</Label>
              <Combobox
                id={`${id}-prod`}
                multiple
                value={filter.productIds}
                onChange={(v) => onChange({ ...filter, productIds: v })}
                load={loadProducts}
                labels={ctx.productLabels}
                placeholder={t('rule.anyProduct')}
                searchPlaceholder={t('prod.search')}
                emptyText={t('common.noResults')}
              />
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor={`${id}-sku`}>{t('rule.skus')}</Label>
              <Combobox
                id={`${id}-sku`}
                multiple
                value={filter.skus}
                onChange={(v) => onChange({ ...filter, skus: v })}
                load={loadSkus}
                labels={Object.fromEntries(filter.skus.map((x) => [x, x]))}
                placeholder={t('rule.anySku')}
                searchPlaceholder={t('price.searchVariant')}
                emptyText={t('common.noResults')}
              />
            </div>
          </div>
          <p className="text-small text-fg-muted">{t('rule.filterHint')}</p>
        </>
      )}
      {error && <p className="text-small text-danger-fg">{t(error as MessageKey)}</p>}
    </div>
  );
}

function RuleCard({
  kind,
  rule,
  index,
  onChange,
  onRemove,
  errors,
  ctx,
}: {
  kind: 'condition' | 'action';
  rule: RuleForm;
  index: number;
  onChange: (r: RuleForm) => void;
  onRemove: () => void;
  errors?: RuleErrors;
  ctx: RuleContext;
}) {
  const { t } = useI18n();
  const types = kind === 'condition' ? CONDITION_TYPES : ACTION_TYPES;
  const fields = FIELDS[rule.type as keyof typeof FIELDS] ?? [];
  const id = rule.key;
  const err = (f: keyof RuleErrors) => (errors?.[f] ? t(errors[f] as MessageKey) : undefined);
  const num = (
    f: 'quantity' | 'maxQuantity' | 'buy' | 'get',
    label: string,
    opts: { hint?: string; optional?: boolean } = {},
  ) => (
    <Field
      id={`${id}-${f}`}
      label={label}
      hint={opts.hint}
      error={err(f)}
      required={!opts.optional}
    >
      <Input
        id={`${id}-${f}`}
        inputMode="numeric"
        className="tabular"
        placeholder={opts.optional ? t('rule.noLimit') : undefined}
        value={rule[f]}
        onChange={(e) => onChange({ ...rule, [f]: e.target.value.replace(/\D/g, '') })}
      />
    </Field>
  );

  return (
    <li className="grid gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-caption font-semibold text-fg-muted">
          {index + 1}
        </span>
        <Select value={rule.type} onValueChange={(type) => onChange({ ...rule, type })}>
          <SelectTrigger
            aria-label={t(kind === 'condition' ? 'rule.conditionType' : 'rule.actionType')}
            className="max-w-sm"
          />
          <SelectContent>
            {types.map((ty) => (
              <SelectItem key={ty} value={ty}>
                {t(`rule.type.${ty}` as MessageKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-fg-muted hover:text-danger-fg"
          aria-label={t('rule.remove')}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      <p className="-mt-2 text-small text-fg-muted">{t(`rule.hint.${rule.type}` as MessageKey)}</p>

      {fields.includes('amounts') && (
        <div className="grid gap-2">
          <Label>
            {rule.type === 'subtotal_at_least'
              ? t('rule.minSubtotal')
              : rule.type === 'fixed_off_items'
                ? t('rule.offEachItem')
                : t('rule.offCart')}
          </Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ctx.currencies.map((c) => (
              <MoneyInput
                key={c}
                aria-label={`${t('gc.amount')} ${c}`}
                currency={c}
                value={rule.amounts[c] ?? ''}
                onChange={(e) =>
                  onChange({ ...rule, amounts: { ...rule.amounts, [c]: e.target.value } })
                }
              />
            ))}
          </div>
          {err('amounts') ? (
            <p className="text-small text-danger-fg">{err('amounts')}</p>
          ) : (
            ctx.currencies.length > 1 && (
              <p className="text-small text-fg-muted">{t('rule.amountsHint')}</p>
            )
          )}
        </div>
      )}
      {(fields.includes('percent') ||
        fields.includes('buy') ||
        fields.includes('quantity') ||
        fields.includes('maxQuantity')) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {fields.includes('quantity') && num('quantity', t('rule.minQuantity'))}
          {fields.includes('buy') && num('buy', t('rule.buy'))}
          {fields.includes('get') && num('get', t('rule.get'))}
          {fields.includes('percent') && (
            <Field
              id={`${id}-percent`}
              label={rule.type === 'buy_x_get_y' ? t('rule.getPercent') : t('rule.percent')}
              hint={rule.type === 'buy_x_get_y' ? t('rule.getPercentHint') : undefined}
              error={err('percent')}
              required
            >
              <div className="relative">
                <Input
                  id={`${id}-percent`}
                  inputMode="decimal"
                  className="tabular pr-8"
                  value={rule.percent}
                  onChange={(e) => onChange({ ...rule, percent: e.target.value })}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-small text-fg-muted">
                  %
                </span>
              </div>
            </Field>
          )}
          {fields.includes('maxQuantity') &&
            num('maxQuantity', t('rule.maxQuantity'), {
              hint: t('rule.maxQuantityHint'),
              optional: true,
            })}
        </div>
      )}
      {fields.includes('groups') && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-groups`}>{t('rule.groups')}</Label>
          <Combobox
            id={`${id}-groups`}
            multiple
            value={rule.groups}
            onChange={(groups) => onChange({ ...rule, groups })}
            options={ctx.groups.map((g) => ({ value: g.code, label: g.name, hint: g.code }))}
            placeholder={t('rule.chooseGroups')}
            searchPlaceholder={t('common.search')}
            emptyText={t('common.noResults')}
            invalid={!!err('groups')}
          />
          {err('groups') && <p className="text-small text-danger-fg">{err('groups')}</p>}
        </div>
      )}
      {fields.includes('filter') && (
        <div className="grid gap-2 rounded-md bg-surface-muted/50 p-3">
          <span className="text-small font-medium">
            {kind === 'condition' ? t('rule.countWhich') : t('rule.appliesTo')}
          </span>
          <FilterField
            id={`${id}-filter`}
            filter={rule.filter}
            onChange={(filter) => onChange({ ...rule, filter })}
            ctx={ctx}
            error={errors?.filter}
          />
        </div>
      )}
    </li>
  );
}

/** An ordered list of conditions or actions with add / change type / remove. */
export function RuleList({
  kind,
  rules,
  onChange,
  errors,
  ctx,
  disabled,
}: {
  kind: 'condition' | 'action';
  rules: RuleForm[];
  onChange: (rules: RuleForm[]) => void;
  errors: Record<string, RuleErrors>;
  ctx: RuleContext;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const types = kind === 'condition' ? CONDITION_TYPES : ACTION_TYPES;
  const max = kind === 'condition' ? 20 : 10;
  return (
    <div className="grid gap-3">
      {rules.length > 0 && (
        <ol
          className="grid gap-3"
          aria-label={t(kind === 'condition' ? 'promo.conditions' : 'promo.actions')}
        >
          {rules.map((r, i) => (
            <RuleCard
              key={r.key}
              kind={kind}
              rule={r}
              index={i}
              errors={errors[r.key]}
              ctx={ctx}
              onChange={(next) => onChange(rules.map((x) => (x.key === r.key ? next : x)))}
              onRemove={() => onChange(rules.filter((x) => x.key !== r.key))}
            />
          ))}
        </ol>
      )}
      {!disabled && rules.length < max && (
        <Menu>
          <MenuTrigger asChild>
            <Button variant="secondary" className="justify-self-start">
              <Plus />
              {t(kind === 'condition' ? 'rule.addCondition' : 'rule.addAction')}
            </Button>
          </MenuTrigger>
          <MenuContent align="start" className="w-80">
            {types.map((ty) => (
              <MenuItem
                key={ty}
                onSelect={() => onChange([...rules, blankRule(ty)])}
                className="h-auto py-2"
              >
                <span className="grid">
                  <span className="text-body">{t(`rule.type.${ty}` as MessageKey)}</span>
                  <span className="text-caption text-fg-muted">
                    {t(`rule.hint.${ty}` as MessageKey)}
                  </span>
                </span>
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      )}
    </div>
  );
}
