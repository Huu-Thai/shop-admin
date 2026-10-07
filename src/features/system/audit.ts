/** Audit helpers shared by the server page and the client view (no directive). */

export type Changes =
  | { kind: 'diff'; rows: { field: string; from: string; to: string }[] }
  | { kind: 'json'; text: string }
  | null;

const show = (v: unknown) =>
  v === null || v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v);

/** The `changes` column: a field diff (`{field: {from, to}}`) when it is one, else pretty JSON. */
export function parseChanges(raw: string | null | undefined): Changes {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { kind: 'json', text: raw };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    const isDiff =
      entries.length > 0 &&
      entries.every(([, v]) => v !== null && typeof v === 'object' && 'from' in v && 'to' in v);
    if (isDiff)
      return {
        kind: 'diff',
        rows: entries.map(([field, v]) => {
          const d = v as { from: unknown; to: unknown };
          return { field, from: show(d.from), to: show(d.to) };
        }),
      };
    if (!entries.length) return null;
  }
  return { kind: 'json', text: JSON.stringify(value, null, 2) };
}

/** Where an audited entity is edited in this admin (unknown types have no link). */
export function entityHref(type: string, id: string | null | undefined): string | null {
  if (!id) return null;
  const map: Record<string, string> = {
    product: `/products/${id}`,
    order: `/orders/${id}`,
    customer: `/customers/${id}`,
    promotion: `/promotions/${id}`,
    campaign: `/promotions/campaigns/${id}`,
    page: `/content/pages/${id}`,
    post: `/content/posts/${id}`,
    block: `/content/blocks/${id}`,
    menu: `/content/menus/${id}`,
    banner: `/merchandising/${id}`,
    slider: `/merchandising/sliders/${id}`,
    category: `/categories?id=${id}`,
    webhook: `/webhooks/${id}`,
    price_book: `/pricing/books/${id}`,
  };
  return map[type] ?? null;
}

export const ACTOR_TYPES = ['admin', 'api-key', 'system', 'customer'] as const;

/** Entity types the shop audits (filter options). */
export const ENTITY_TYPES = [
  'admin_user',
  'api_key',
  'attribute',
  'attribute_set',
  'banner',
  'block',
  'campaign',
  'category',
  'coupon',
  'coupon_batch',
  'currency',
  'customer',
  'customer_address',
  'customer_group',
  'exchange_rate',
  'image',
  'inventory',
  'inventory_source',
  'job',
  'locale',
  'loyalty_account',
  'loyalty_tier',
  'menu',
  'menu_item',
  'order',
  'page',
  'payment',
  'payment_method',
  'payment_provider',
  'post',
  'price_book',
  'product',
  'promotion',
  'role',
  'shipping_method',
  'slide',
  'slider',
  'store',
  'tag',
  'tax_class',
  'tax_rate',
  'tax_zone',
  'url_rewrite',
  'webhook',
  'website',
];
