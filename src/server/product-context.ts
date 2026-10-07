import 'server-only';
import type { ProductFormContext } from '@/features/catalog/products/product-form';
import { getLocale } from '@/i18n/server';
import {
  getAttributes,
  getAttributeSets,
  getCategoryTree,
  getLocales,
  getStores,
  getTaxClasses,
  getWebsites,
} from './catalog';

/** Reference data for product screens, plus the store locale closest to the admin's language. */
export async function productContext(): Promise<
  ProductFormContext & { stores: Awaited<ReturnType<typeof getStores>>; nameLocale?: string }
> {
  const [sets, attributes, locales, websites, stores, taxClasses, tree, adminLocale] =
    await Promise.all([
      getAttributeSets(),
      getAttributes(),
      getLocales(),
      getWebsites(),
      getStores(),
      getTaxClasses(),
      getCategoryTree(),
      getLocale(),
    ]);
  const currencies = [
    ...new Set([
      ...websites.map((w) => w.baseCurrencyCode),
      ...stores.flatMap((s) => s.currencyCodes),
    ]),
  ].sort();
  return {
    sets,
    attributes,
    locales: locales.map((l) => ({ code: l.code, name: l.name })),
    websites,
    stores,
    taxClasses,
    tree,
    currencies,
    defaultCurrency: websites[0]?.baseCurrencyCode ?? currencies[0] ?? 'USD',
    nameLocale:
      locales.find((l) => l.code.toLowerCase().startsWith(adminLocale))?.code ?? locales[0]?.code,
  };
}
