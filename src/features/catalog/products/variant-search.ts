'use client';

import type { ComboOption } from '@/components/ui/combobox';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { describeOptions, optionLabels } from './option-labels';

export type VariantHit = Schemas['VariantSearchItemDto'];

/** Remote variant search for pickers: label = SKU, hint = product name and options. */
export function variantSearch(
  opts: { nameLocale?: string; bundleable?: boolean; exclude?: string[] } = {},
) {
  const cache = new Map<string, VariantHit>();
  const load = async (query: string): Promise<ComboOption[]> => {
    const q = new URLSearchParams({ limit: '20' });
    if (query) q.set('search', query);
    if (opts.nameLocale) q.set('locale', opts.nameLocale);
    if (opts.bundleable) q.set('bundleable', 'true');
    const [hits, labels] = await Promise.all([
      gw<VariantHit[]>(`variants?${q}`),
      optionLabels(opts.nameLocale ?? 'en'),
    ]);
    for (const h of hits) cache.set(h.id, h);
    return hits.map((h) => ({
      value: h.id,
      label: h.sku,
      hint: [h.productName ?? h.productSku, describeOptions(h.optionValues, labels)]
        .filter(Boolean)
        .join(' · '),
      disabled: opts.exclude?.includes(h.id),
    }));
  };
  return { load, get: (id: string) => cache.get(id) };
}
