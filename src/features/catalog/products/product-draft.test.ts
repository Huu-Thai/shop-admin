import { describe, expect, it } from 'vitest';
import type { Schemas } from '@/server/api';
import type { AttrDef } from './attribute-values';
import {
  draftFromProduct,
  newDraft,
  toCreatePayload,
  toMinor,
  toUpdatePayload,
  validateDraft,
} from './product-draft';

const defs: AttrDef[] = [
  { code: 'material', type: 'TEXT', isRequired: true, isLocalizable: false, options: [] },
  {
    code: 'color',
    type: 'SELECT',
    isRequired: true,
    isLocalizable: false,
    options: [{ code: 'red' }],
  },
  { code: 'care', type: 'TEXTAREA', isRequired: false, isLocalizable: true, options: [] },
];
const ctx = { defs, defaultLocale: 'en-US', creating: true, currency: 'USD' };

const product = {
  id: 'p1',
  sku: 'TEE',
  type: 'SIMPLE',
  status: 'ENABLED',
  visibility: 'CATALOG_SEARCH',
  attributeSetId: 's1',
  attributes: { material: 'Cotton', color: 'red' },
  typeOptions: {},
  weightGrams: 200,
  taxClassId: null,
  translations: [
    {
      localeCode: 'en-US',
      name: 'Tee',
      slug: 'tee',
      shortDescription: null,
      description: null,
      metaTitle: null,
      metaDescription: null,
      attributes: { care: 'Wash cold' },
    },
    {
      localeCode: 'vi-VN',
      name: 'Áo',
      slug: 'ao',
      shortDescription: null,
      description: null,
      metaTitle: null,
      metaDescription: null,
      attributes: {},
    },
  ],
  websiteIds: ['w1'],
  categories: [
    { categoryId: 'c2', position: 1 },
    { categoryId: 'c1', position: 0 },
  ],
  configurableAttributes: [],
  variants: [],
  bundleOptions: [],
  storeOverrides: [],
  relations: { related: [], upsell: [], crossSell: [] },
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
} as unknown as Schemas['ProductDto'];

describe('product draft', () => {
  it('validates a new product like the API (sku, name, required attributes)', () => {
    const d = newDraft({ type: 'SIMPLE', attributeSetId: 's1', websiteIds: ['w1'], defs });
    expect(validateDraft(d, ctx)).toEqual({
      sku: 'prod.err.sku',
      name: 'prod.err.name',
      'attr.material': 'attrv.err.required',
      'attr.color': 'attrv.err.required',
    });
    const configurable = {
      ...newDraft({ type: 'CONFIGURABLE', attributeSetId: 's1', websiteIds: [], defs }),
      sku: 'X',
    };
    expect(validateDraft(configurable, ctx).axes).toBe('prod.err.axes');
    // an axis is set on variants, so it is not required on the product
    configurable.configurableAttributes = ['color'];
    expect(validateDraft(configurable, ctx)['attr.color']).toBeUndefined();
  });

  it('builds a create payload with slugs, categories in order and no empty values', () => {
    const d = newDraft({ type: 'SIMPLE', attributeSetId: 's1', websiteIds: ['w1'], defs });
    d.sku = 'TEE-1';
    d.weight = '250';
    d.attributes = { material: 'Wool', color: 'red' };
    d.categoryIds = ['c1', 'c2'];
    d.translations['en-US'] = {
      name: 'Wool Tee',
      slug: '',
      shortDescription: '',
      description: '',
      metaTitle: '',
      metaDescription: '',
      attributes: { care: '' },
    };
    expect(validateDraft(d, ctx)).toEqual({});
    expect(toCreatePayload(d, defs, 'USD')).toMatchObject({
      sku: 'TEE-1',
      type: 'SIMPLE',
      weightGrams: 250,
      attributes: { material: 'Wool', color: 'red' },
      translations: [{ localeCode: 'en-US', name: 'Wool Tee', slug: 'wool-tee' }],
      categories: [
        { categoryId: 'c1', position: 0 },
        { categoryId: 'c2', position: 1 },
      ],
    });
  });

  it('round-trips a product and builds an update that removes cleared values and locales', () => {
    const d = draftFromProduct(product, defs);
    expect(d.categoryIds).toEqual(['c1', 'c2']);
    expect(d.translations['en-US'].attributes.care).toBe('Wash cold');
    d.translations['en-US'].attributes.care = '';
    d.translations['vi-VN'].name = '';
    const body = toUpdatePayload(d, product, defs, 'USD');
    expect(body.sku).toBeUndefined();
    expect(body.removeLocales).toEqual(['vi-VN']);
    expect(body.translations).toEqual([
      expect.objectContaining({ localeCode: 'en-US', attributes: { care: null } }),
    ]);
  });

  it('gift cards: amounts in minor units, open amount range, validity', () => {
    expect(toMinor('25.5', 'USD')).toBe(2550);
    expect(toMinor('200000', 'VND')).toBe(200000);
    const d = {
      ...newDraft({ type: 'GIFT_CARD', attributeSetId: 's1', websiteIds: [], defs: [] }),
      sku: 'GC',
    };
    d.translations['en-US'] = {
      name: 'Gift card',
      slug: '',
      shortDescription: '',
      description: '',
      metaTitle: '',
      metaDescription: '',
      attributes: {},
    };
    expect(validateDraft(d, { ...ctx, defs: [] })['gc.amounts']).toBe('prod.err.giftAmounts');
    d.giftCard = {
      cardType: 'VIRTUAL',
      amounts: [{ currency: 'USD', amount: '25' }],
      allowOpenAmount: true,
      openAmountMin: '10',
      openAmountMax: '5',
      lifetimeDays: '365',
    };
    expect(validateDraft(d, { ...ctx, defs: [] })['gc.open']).toBe('prod.err.openAmount');
    d.giftCard.openAmountMax = '500';
    d.weight = '100';
    const body = toCreatePayload(d, [], 'USD');
    expect(body.typeOptions).toEqual({
      cardType: 'VIRTUAL',
      amounts: [{ currency: 'USD', amount: 2500 }],
      allowOpenAmount: true,
      lifetimeDays: 365,
      openAmountMin: 1000,
      openAmountMax: 50000,
    });
    // virtual cards have no weight
    expect(body.weightGrams).toBeUndefined();
    // …and loading it back shows the same amounts in major units
    const loaded = draftFromProduct(
      { ...product, type: 'GIFT_CARD', typeOptions: body.typeOptions } as Schemas['ProductDto'],
      [],
    );
    expect(loaded.giftCard).toMatchObject({
      openAmountMin: '10.00',
      openAmountMax: '500.00',
      amounts: [{ currency: 'USD', amount: '25.00' }],
      lifetimeDays: '365',
    });
  });
});
