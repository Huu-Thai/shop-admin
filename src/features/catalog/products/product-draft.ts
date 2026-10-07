/**
 * The product details form as plain data: built from the API product, validated like the API,
 * and turned into create / update payloads. Pure (unit-tested); the form component only renders.
 */
import type { Schemas } from '@/server/api';
import { SKU_PATTERN, SLUG_PATTERN, slugify } from '../shared';
import {
  type AttrDef,
  buildValues,
  emptyValue,
  type FormValues,
  formValues,
} from './attribute-values';
import { isShippable } from './product-meta';

type Product = Schemas['ProductDto'];

export interface TranslationDraft {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  attributes: FormValues;
}

export interface GiftCardDraft {
  cardType: 'VIRTUAL' | 'PHYSICAL';
  amounts: { currency: string; amount: string }[];
  allowOpenAmount: boolean;
  openAmountMin: string;
  openAmountMax: string;
  /** '' = never expires */
  lifetimeDays: string;
}

export interface BundleDraft {
  priceType: 'DYNAMIC' | 'FIXED';
  shipmentType: 'TOGETHER' | 'SEPARATELY';
}

export interface ProductDraft {
  sku: string;
  type: string;
  attributeSetId: string;
  status: 'ENABLED' | 'DISABLED';
  visibility: string;
  taxClassId: string | null;
  /** Grams, as typed. */
  weight: string;
  websiteIds: string[];
  categoryIds: string[];
  configurableAttributes: string[];
  bundle: BundleDraft;
  giftCard: GiftCardDraft;
  attributes: FormValues;
  translations: Record<string, TranslationDraft>;
}

export const emptyTranslation = (defs: AttrDef[]): TranslationDraft => ({
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
  attributes: Object.fromEntries(
    defs.filter((d) => d.isLocalizable).map((d) => [d.code, emptyValue(d)]),
  ),
});

const defaultGiftCard: GiftCardDraft = {
  cardType: 'VIRTUAL',
  amounts: [],
  allowOpenAmount: false,
  openAmountMin: '',
  openAmountMax: '',
  lifetimeDays: '',
};

export { toMajor, toMinor } from '@/lib/money';
import { toMajor, toMinor } from '@/lib/money';

/** Global (non-localizable) definitions, without the configurable axes. */
export const globalDefs = (defs: AttrDef[], axes: string[]) =>
  defs.filter((d) => !d.isLocalizable && !axes.includes(d.code));
export const localDefs = (defs: AttrDef[]) => defs.filter((d) => d.isLocalizable);

export function newDraft(opts: {
  type: string;
  attributeSetId: string;
  websiteIds: string[];
  defs: AttrDef[];
}): ProductDraft {
  return {
    sku: '',
    type: opts.type,
    attributeSetId: opts.attributeSetId,
    status: 'ENABLED',
    visibility: 'CATALOG_SEARCH',
    taxClassId: null,
    weight: '',
    websiteIds: opts.websiteIds,
    categoryIds: [],
    configurableAttributes: [],
    bundle: { priceType: 'DYNAMIC', shipmentType: 'TOGETHER' },
    giftCard: { ...defaultGiftCard },
    attributes: formValues(globalDefs(opts.defs, []), {}),
    translations: {},
  };
}

export function draftFromProduct(p: Product, defs: AttrDef[], currency = 'USD'): ProductDraft {
  const to = p.typeOptions as Record<string, unknown>;
  const amounts = (to.amounts as { currency: string; amount: number }[] | undefined) ?? [];
  const openCurrency = amounts[0]?.currency ?? currency;
  return {
    sku: p.sku,
    type: p.type,
    attributeSetId: p.attributeSetId,
    status: p.status,
    visibility: p.visibility,
    taxClassId: p.taxClassId,
    weight: p.weightGrams == null ? '' : String(p.weightGrams),
    websiteIds: [...p.websiteIds],
    categoryIds: [...p.categories].sort((a, b) => a.position - b.position).map((c) => c.categoryId),
    configurableAttributes: [...p.configurableAttributes],
    bundle: {
      priceType: (to.priceType as BundleDraft['priceType']) ?? 'DYNAMIC',
      shipmentType: (to.shipmentType as BundleDraft['shipmentType']) ?? 'TOGETHER',
    },
    giftCard:
      p.type === 'GIFT_CARD'
        ? {
            cardType: (to.cardType as GiftCardDraft['cardType']) ?? 'VIRTUAL',
            amounts: amounts.map((a) => ({
              currency: a.currency,
              amount: toMajor(a.amount, a.currency),
            })),
            allowOpenAmount: to.allowOpenAmount === true,
            openAmountMin:
              typeof to.openAmountMin === 'number' ? toMajor(to.openAmountMin, openCurrency) : '',
            openAmountMax:
              typeof to.openAmountMax === 'number' ? toMajor(to.openAmountMax, openCurrency) : '',
            lifetimeDays: typeof to.lifetimeDays === 'number' ? String(to.lifetimeDays) : '',
          }
        : { ...defaultGiftCard },
    attributes: formValues(
      globalDefs(defs, p.configurableAttributes),
      p.attributes as Record<string, unknown>,
    ),
    translations: Object.fromEntries(
      p.translations.map((tr) => [
        tr.localeCode,
        {
          name: tr.name,
          slug: tr.slug,
          shortDescription: tr.shortDescription ?? '',
          description: tr.description ?? '',
          metaTitle: tr.metaTitle ?? '',
          metaDescription: tr.metaDescription ?? '',
          attributes: formValues(localDefs(defs), tr.attributes as Record<string, unknown>),
        },
      ]),
    ),
  };
}

/** Gift-card open amounts are typed in the first amount's currency (or the default one). */
export const openAmountCurrency = (g: GiftCardDraft, fallback: string) =>
  g.amounts[0]?.currency ?? fallback;

export function typeOptionsOf(d: ProductDraft, currency: string): Record<string, unknown> {
  if (d.type === 'BUNDLE') return { ...d.bundle };
  if (d.type !== 'GIFT_CARD') return {};
  const g = d.giftCard;
  const cur = openAmountCurrency(g, currency);
  return {
    cardType: g.cardType,
    amounts: g.amounts.map((a) => ({
      currency: a.currency,
      amount: toMinor(a.amount, a.currency),
    })),
    allowOpenAmount: g.allowOpenAmount,
    lifetimeDays: g.lifetimeDays.trim() ? Number(g.lifetimeDays) : null,
    ...(g.allowOpenAmount
      ? {
          openAmountMin: toMinor(g.openAmountMin, cur),
          openAmountMax: toMinor(g.openAmountMax, cur),
        }
      : {}),
  };
}

export type DraftErrors = Record<string, string>;

/** Field errors (i18n keys) keyed by path: sku, name, slug.<locale>, attr.<code>, tr.<locale>.<code>, … */
export function validateDraft(
  d: ProductDraft,
  ctx: { defs: AttrDef[]; defaultLocale: string; creating: boolean; currency: string },
): DraftErrors {
  const e: DraftErrors = {};
  if (!SKU_PATTERN.test(d.sku)) e.sku = 'prod.err.sku';
  if (!d.translations[ctx.defaultLocale]?.name.trim()) e.name = 'prod.err.name';
  if (ctx.creating && d.type === 'CONFIGURABLE') {
    if (!d.configurableAttributes.length) e.axes = 'prod.err.axes';
    else if (d.configurableAttributes.length > 5) e.axes = 'prod.err.axesMax';
  }
  if (d.weight.trim() && !(/^\d+$/.test(d.weight.trim()) && Number(d.weight) <= 1_000_000_000))
    e.weight = 'prod.err.weight';

  const g = globalDefs(ctx.defs, d.configurableAttributes);
  for (const [code, err] of Object.entries(buildValues(g, d.attributes).errors))
    e[`attr.${code}`] = err;
  for (const [locale, tr] of Object.entries(d.translations)) {
    if (!tr.name.trim()) continue; // untranslated locales are skipped (removed on save)
    if (tr.slug && !SLUG_PATTERN.test(tr.slug)) e[`slug.${locale}`] = 'prod.err.slug';
    for (const [code, err] of Object.entries(
      buildValues(localDefs(ctx.defs), tr.attributes).errors,
    ))
      e[`tr.${locale}.${code}`] = err;
  }
  // The default locale must carry every required localizable value.
  if (!d.translations[ctx.defaultLocale])
    for (const def of localDefs(ctx.defs))
      if (def.isRequired) e[`tr.${ctx.defaultLocale}.${def.code}`] = 'attrv.err.required';

  if (d.type === 'GIFT_CARD') {
    const gc = d.giftCard;
    gc.amounts.forEach((a, i) => {
      const m = toMinor(a.amount, a.currency);
      if (!(Number.isSafeInteger(m) && m > 0)) e[`gc.amount.${i}`] = 'prod.err.amount';
    });
    if (gc.allowOpenAmount) {
      const cur = openAmountCurrency(gc, ctx.currency);
      const min = toMinor(gc.openAmountMin, cur);
      const max = toMinor(gc.openAmountMax, cur);
      if (!(min > 0 && max > 0 && min <= max)) e['gc.open'] = 'prod.err.openAmount';
    } else if (!gc.amounts.length) e['gc.amounts'] = 'prod.err.giftAmounts';
    if (gc.lifetimeDays.trim() && !(/^\d+$/.test(gc.lifetimeDays) && Number(gc.lifetimeDays) > 0))
      e['gc.lifetime'] = 'prod.err.lifetime';
  }
  return e;
}

function translationsPayload(d: ProductDraft, defs: AttrDef[], original?: Product) {
  return Object.entries(d.translations)
    .filter(([, tr]) => tr.name.trim())
    .map(([localeCode, tr]) => {
      const before = original?.translations.find((x) => x.localeCode === localeCode);
      const { values } = buildValues(
        localDefs(defs),
        tr.attributes,
        before ? (before.attributes as Record<string, unknown>) : undefined,
      );
      return {
        localeCode,
        name: tr.name.trim(),
        slug: tr.slug.trim() || slugify(tr.name),
        ...(tr.shortDescription.trim() ? { shortDescription: tr.shortDescription.trim() } : {}),
        ...(tr.description.trim() ? { description: tr.description.trim() } : {}),
        ...(tr.metaTitle.trim() ? { metaTitle: tr.metaTitle.trim() } : {}),
        ...(tr.metaDescription.trim() ? { metaDescription: tr.metaDescription.trim() } : {}),
        ...(Object.keys(values).length ? { attributes: values } : {}),
      };
    });
}

const weightOf = (d: ProductDraft, typeOptions: Record<string, unknown>) =>
  isShippable(d.type, typeOptions) && d.weight.trim() ? Number(d.weight) : undefined;

export function toCreatePayload(
  d: ProductDraft,
  defs: AttrDef[],
  currency: string,
): Schemas['CreateProductDto'] {
  const typeOptions = typeOptionsOf(d, currency);
  const weightGrams = weightOf(d, typeOptions);
  return {
    sku: d.sku.trim(),
    type: d.type as Schemas['ProductType'],
    attributeSetId: d.attributeSetId,
    status: d.status,
    visibility: d.visibility as Schemas['ProductVisibility'],
    taxClassId: d.taxClassId,
    attributes: buildValues(globalDefs(defs, d.configurableAttributes), d.attributes).values,
    ...(Object.keys(typeOptions).length ? { typeOptions } : {}),
    ...(weightGrams !== undefined ? { weightGrams } : {}),
    translations: translationsPayload(d, defs),
    websiteIds: d.websiteIds,
    categories: d.categoryIds.map((categoryId, position) => ({ categoryId, position })),
    ...(d.type === 'CONFIGURABLE' ? { configurableAttributes: d.configurableAttributes } : {}),
  } as Schemas['CreateProductDto'];
}

export function toUpdatePayload(
  d: ProductDraft,
  original: Product,
  defs: AttrDef[],
  currency: string,
): Schemas['UpdateProductDto'] {
  const typeOptions = typeOptionsOf(d, currency);
  const weightGrams = weightOf(d, typeOptions) ?? null;
  const removeLocales = original.translations
    .map((t) => t.localeCode)
    .filter((c) => !d.translations[c]?.name.trim());
  return {
    ...(d.sku.trim() !== original.sku ? { sku: d.sku.trim() } : {}),
    status: d.status,
    visibility: d.visibility as Schemas['ProductVisibility'],
    taxClassId: d.taxClassId,
    weightGrams: isShippable(d.type, typeOptions) ? weightGrams : null,
    attributes: buildValues(
      globalDefs(defs, d.configurableAttributes),
      d.attributes,
      original.attributes as Record<string, unknown>,
    ).values,
    ...(Object.keys(typeOptions).length ? { typeOptions } : {}),
    translations: translationsPayload(d, defs, original),
    ...(removeLocales.length ? { removeLocales } : {}),
    websiteIds: d.websiteIds,
    categories: d.categoryIds.map((categoryId, position) => ({ categoryId, position })),
  } as Schemas['UpdateProductDto'];
}
