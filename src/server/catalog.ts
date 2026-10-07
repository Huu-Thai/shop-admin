import 'server-only';
import { cache } from 'react';
import { adminApi, call, type Schemas } from './api';

/**
 * Reference data for catalog screens, fetched once per request. All of it is small (locales,
 * websites, stores, attribute definitions, sets, tax classes, the category tree).
 */
export type Locale = Schemas['LocaleDto'];
export type Website = Schemas['WebsiteDto'];
export type Store = Schemas['StoreDto'];
export type Attribute = Schemas['AttributeDto'];
export type AttributeSet = Schemas['AttributeSetDto'];
export type TaxClass = Schemas['TaxClassDto'];
export type CategoryNode = Schemas['CategoryNodeDto'];

export const getLocales = cache(async (): Promise<Locale[]> =>
  call(adminApi().GET('/api/v1/admin/locales', { params: { query: { active: true } } })),
);
/** Every locale, inactive ones too (store setup). */
export const getAllLocales = cache(async (): Promise<Locale[]> =>
  call(adminApi().GET('/api/v1/admin/locales')),
);
export const getWebsites = cache(async (): Promise<Website[]> =>
  call(adminApi().GET('/api/v1/admin/websites')),
);
export const getStores = cache(async (): Promise<Store[]> =>
  call(adminApi().GET('/api/v1/admin/stores')),
);
export const getAttributes = cache(async (): Promise<Attribute[]> =>
  call(adminApi().GET('/api/v1/admin/attributes')),
);
export const getAttributeSets = cache(async (): Promise<AttributeSet[]> =>
  call(adminApi().GET('/api/v1/admin/attribute-sets')),
);
export const getTaxClasses = cache(async (): Promise<TaxClass[]> =>
  call(adminApi().GET('/api/v1/admin/tax/classes')),
);
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> =>
  call(adminApi().GET('/api/v1/admin/categories/tree')),
);

export type Currency = Schemas['CurrencyDto'];
export type CustomerGroup = Schemas['CustomerGroupDto'];
export type PriceBook = Schemas['PriceBookDto'];
export type Source = Schemas['InventorySourceDto'];
export type TaxZone = Schemas['TaxZoneDto'];

export const getCurrencies = cache(async (): Promise<Currency[]> =>
  call(adminApi().GET('/api/v1/admin/currencies')),
);
export const getCustomerGroups = cache(async (): Promise<CustomerGroup[]> =>
  call(adminApi().GET('/api/v1/admin/customer-groups')),
);
export const getPriceBooks = cache(async (): Promise<PriceBook[]> =>
  call(adminApi().GET('/api/v1/admin/price-books')),
);
export const getSources = cache(async (): Promise<Source[]> =>
  call(adminApi().GET('/api/v1/admin/inventory/sources')),
);
export const getTaxZones = cache(async (): Promise<TaxZone[]> =>
  call(adminApi().GET('/api/v1/admin/tax/zones')),
);
