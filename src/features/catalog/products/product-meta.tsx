import { Boxes, Gift, Package, Layers3, Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { MessageKey } from '@/i18n';

export const PRODUCT_TYPES = ['SIMPLE', 'CONFIGURABLE', 'BUNDLE', 'VIRTUAL', 'GIFT_CARD'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const VISIBILITIES = ['CATALOG_SEARCH', 'CATALOG', 'SEARCH', 'NOT_VISIBLE'] as const;

export const TYPE_ICON: Record<ProductType, ReactNode> = {
  SIMPLE: <Package />,
  CONFIGURABLE: <Layers3 />,
  BUNDLE: <Boxes />,
  VIRTUAL: <Download />,
  GIFT_CARD: <Gift />,
};

const TYPE_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  SIMPLE: 'neutral',
  CONFIGURABLE: 'info',
  BUNDLE: 'accent',
  VIRTUAL: 'outline',
  GIFT_CARD: 'warning',
};

export function TypeBadge({ type, label }: { type: string; label: string }) {
  return <Badge tone={TYPE_TONE[type] ?? 'neutral'}>{label}</Badge>;
}

export const typeKey = (t: string) => `prod.type.${t}` as MessageKey;
export const visibilityKey = (v: string) => `prod.vis.${v}` as MessageKey;

/** Single-variant types (the API keeps one default variant with the product's SKU). */
export const isSingleVariant = (t: string) => t !== 'CONFIGURABLE';
/** Shippable (has a weight) unless virtual, or a virtual gift card. */
export const isShippable = (t: string, typeOptions: Record<string, unknown>) =>
  t !== 'VIRTUAL' && !(t === 'GIFT_CARD' && typeOptions.cardType !== 'PHYSICAL');

/** Editor tabs by product type (shared by the server page and the client header). */
export type ProductTab =
  'details' | 'images' | 'variants' | 'bundle' | 'pricing' | 'stores' | 'related';

export function tabsFor(type: string): ProductTab[] {
  return [
    'details',
    'images',
    ...(type === 'CONFIGURABLE' ? (['variants'] as const) : []),
    ...(type === 'BUNDLE' ? (['bundle'] as const) : []),
    'pricing',
    'stores',
    'related',
  ];
}
