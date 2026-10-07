import 'server-only';
import type { PromotionEditorContext } from '@/features/marketing/promotion-editor';
import { getLocale } from '@/i18n/server';
import { adminApi, call } from './api';
import { getCategoryTree, getCustomerGroups, getLocales, getStores, getWebsites } from './catalog';

/** Currencies the stores sell in, default currencies first. */
export async function getSellingCurrencies(): Promise<string[]> {
  const stores = await getStores();
  return [
    ...new Set([
      ...stores.map((s) => s.defaultCurrencyCode),
      ...stores.flatMap((s) => s.currencyCodes),
    ]),
  ];
}

/** Reference data for the promotion editor; `productIds` are labelled for the pickers. */
export async function promotionEditorContext(
  productIds: string[] = [],
): Promise<PromotionEditorContext> {
  const [websites, stores, locales, groups, tree, campaigns, adminLocale] = await Promise.all([
    getWebsites(),
    getStores(),
    getLocales(),
    getCustomerGroups(),
    getCategoryTree(),
    call(
      adminApi().GET('/api/v1/admin/marketing/campaigns', {
        params: { query: { limit: 200, order: 'desc' } },
      }),
    ),
    getLocale(),
  ]);
  const active = locales.filter((l) => l.isActive);
  const nameLocale =
    active.find((l) => l.code.toLowerCase().startsWith(adminLocale))?.code ?? active[0]?.code;
  const ids = [...new Set(productIds)].slice(0, 100);
  const products = ids.length
    ? await call(
        adminApi().GET('/api/v1/admin/products', {
          params: { query: { ids, limit: 100, locale: nameLocale } },
        }),
      )
    : { data: [] };
  return {
    websites,
    stores,
    locales: active.map((l) => ({ code: l.code, name: l.name })),
    groups,
    tree,
    campaigns: campaigns.data,
    nameLocale,
    productLabels: Object.fromEntries(products.data.map((p) => [p.id, p.name ?? p.sku])),
  };
}
