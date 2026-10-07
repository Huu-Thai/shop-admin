'use client';

import type { ComboOption } from '@/components/ui/combobox';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';

/** Remote product search for pickers (relations, bundle selections). */
export function productSearch(opts: {
  nameLocale?: string;
  exclude?: string[];
  types?: string[];
  typeLabel: (type: string) => string;
}) {
  return async (query: string): Promise<ComboOption[]> => {
    const q = new URLSearchParams({ limit: '20', sort: 'updatedAt', order: 'desc' });
    if (query) q.set('search', query);
    if (opts.nameLocale) q.set('locale', opts.nameLocale);
    const r = await gw<Schemas['ProductListDto']>(`products?${q}`);
    return r.data
      .filter((p) => !opts.types || opts.types.includes(p.type))
      .map((p) => ({
        value: p.id,
        label: p.name ?? p.sku,
        hint: `${p.sku} · ${opts.typeLabel(p.type)}`,
        disabled: opts.exclude?.includes(p.id),
      }));
  };
}

export const getProduct = (id: string) => gw<Schemas['ProductDto']>(`products/${id}`);
