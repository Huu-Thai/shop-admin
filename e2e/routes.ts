import type { APIRequestContext } from '@playwright/test';

/** Every screen of the admin. `:id` routes take the first item of `list` (skipped when empty). */
export interface Route {
  path: string;
  list?: { url: string; pick?: (body: unknown) => string | undefined };
}

const first = (body: unknown): string | undefined => {
  const rows = Array.isArray(body) ? body : (body as { data?: unknown[] })?.data;
  return (rows?.[0] as { id?: string } | undefined)?.id;
};

export const ROUTES: Route[] = [
  { path: '/' },
  { path: '/orders' },
  { path: '/orders/:id', list: { url: 'orders?limit=1' } },
  { path: '/payments' },
  { path: '/payments/webhooks' },
  { path: '/shipping' },
  { path: '/products' },
  { path: '/products/new' },
  { path: '/products/:id', list: { url: 'products?limit=1' } },
  { path: '/categories' },
  { path: '/attributes' },
  { path: '/attribute-sets' },
  { path: '/media' },
  { path: '/pricing' },
  { path: '/pricing/books/:id', list: { url: 'price-books' } },
  { path: '/pricing/rates' },
  { path: '/pricing/preview' },
  { path: '/tax' },
  { path: '/tax/calculate' },
  { path: '/tax/zones/:id', list: { url: 'tax/zones' } },
  { path: '/inventory' },
  { path: '/inventory/movements' },
  { path: '/inventory/reservations' },
  { path: '/inventory/sources' },
  { path: '/customers' },
  { path: '/customers/:id', list: { url: 'customers?limit=1' } },
  { path: '/customers/groups' },
  { path: '/promotions' },
  { path: '/promotions/new' },
  { path: '/promotions/:id', list: { url: 'marketing/promotions?limit=1' } },
  { path: '/promotions/campaigns' },
  { path: '/promotions/campaigns/:id', list: { url: 'marketing/campaigns?limit=1' } },
  { path: '/promotions/simulate' },
  { path: '/loyalty' },
  { path: '/loyalty/accounts' },
  { path: '/content' },
  { path: '/content/pages/new' },
  { path: '/content/pages/:id', list: { url: 'cms/pages?limit=1' } },
  { path: '/content/posts' },
  { path: '/content/posts/new' },
  { path: '/content/posts/:id', list: { url: 'cms/posts?limit=1' } },
  { path: '/content/blocks' },
  { path: '/content/blocks/new' },
  { path: '/content/blocks/:id', list: { url: 'cms/blocks?limit=1' } },
  { path: '/content/menus' },
  { path: '/content/menus/:id', list: { url: 'navigation/menus' } },
  { path: '/content/redirects' },
  { path: '/content/schedule' },
  { path: '/merchandising' },
  { path: '/merchandising/new' },
  { path: '/merchandising/:id', list: { url: 'merchandising/banners?limit=1' } },
  { path: '/merchandising/sliders' },
  { path: '/merchandising/sliders/:id', list: { url: 'merchandising/sliders?limit=1' } },
  { path: '/stores' },
  { path: '/stores/locales' },
  { path: '/stores/currencies' },
  { path: '/stores/search' },
  { path: '/users' },
  { path: '/users/roles' },
  { path: '/users/api-keys' },
  { path: '/audit' },
  { path: '/jobs' },
  { path: '/jobs/import' },
  { path: '/jobs/export' },
  { path: '/jobs/scheduled' },
  { path: '/webhooks' },
  { path: '/settings' },
  { path: '/style-guide' },
];

/** The concrete URL of a route, or null when its list is empty. */
export async function resolve(route: Route, request: APIRequestContext): Promise<string | null> {
  if (!route.list) return route.path;
  const res = await request.get(`/api/gw/${route.list.url}`);
  if (!res.ok()) return null;
  const id = (route.list.pick ?? first)(await res.json());
  return id ? route.path.replace(':id', id) : null;
}
