'use client';

import { useEffect, useState } from 'react';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { pickLocalized } from '../shared';

type Labels = Map<string, string>;
let cached: Promise<Schemas['AttributeDto'][]> | null = null;

/** Attribute definitions, fetched once per page load (they change rarely). */
function attributes(): Promise<Schemas['AttributeDto'][]> {
  cached ??= gw<Schemas['AttributeDto'][]>('attributes').catch(() => {
    cached = null;
    return [];
  });
  return cached;
}

/** `color:black` → "Black" in the admin's language (codes when unknown). */
export async function optionLabels(locale: string): Promise<Labels> {
  const out: Labels = new Map();
  for (const a of await attributes())
    for (const o of a.options)
      out.set(`${a.code}:${o.code}`, pickLocalized(o.labels, locale)?.label ?? o.code);
  return out;
}

/** "M / Black" for a variant's option values. */
export const describeOptions = (values: Record<string, string>, labels: Labels) =>
  Object.entries(values)
    .map(([attr, code]) => labels.get(`${attr}:${code}`) ?? code)
    .join(' / ');

/** The labels as React state (empty until loaded, so codes show first). */
export function useOptionLabels(locale: string): Labels {
  const [labels, setLabels] = useState<Labels>(new Map());
  useEffect(() => {
    let live = true;
    void optionLabels(locale).then((l) => live && setLabels(l));
    return () => {
      live = false;
    };
  }, [locale]);
  return labels;
}
