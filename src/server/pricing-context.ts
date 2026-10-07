import 'server-only';
import type { PricingRefs } from '@/features/pricing/book-sheet';
import { getCurrencies, getCustomerGroups, getStores, getWebsites } from './catalog';

export async function pricingRefs(): Promise<PricingRefs> {
  const [currencies, websites, stores, groups] = await Promise.all([
    getCurrencies(),
    getWebsites(),
    getStores(),
    getCustomerGroups(),
  ]);
  return { currencies: currencies.filter((c) => c.isActive), websites, stores, groups };
}
