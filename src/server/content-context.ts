import 'server-only';
import type { ArticleContext } from '@/features/content/article-editor';
import type { BlockContext } from '@/features/content/block-editor';
import { flatten } from '@/features/catalog/categories/tree';
import { adminApi, call } from './api';
import { CONTENT_STATUSES } from '@/features/marketing/tabs';
import { getLocale } from '@/i18n/server';
import { pickLocalized } from '@/features/catalog/shared';
import { getCategoryTree, getLocales, getStores } from './catalog';

export const CONTENT_LIMIT = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

/** Paging and the shared filters of content lists, validated. */
export function contentQuery(sp: Record<string, string | string[] | undefined>) {
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  return {
    page: Math.max(1, Number(sp.page) || 1),
    limit: CONTENT_LIMIT,
    order: 'desc' as const,
    search: str(sp.search)?.slice(0, 100),
    status: CONTENT_STATUSES.find((s) => s === sp.status),
    storeId: isUuid(sp.storeId) ? sp.storeId : undefined,
  };
}

/** Stores, active store locales (default store's first) and the admin's language. */
export async function contentContext() {
  const [stores, locales, adminLocale] = await Promise.all([
    getStores(),
    getLocales(),
    getLocale(),
  ]);
  const first = stores[0]?.defaultLocaleCode;
  const ordered = [...locales].sort((a, b) => Number(b.code === first) - Number(a.code === first));
  return {
    stores,
    locales: ordered.map((l) => ({ code: l.code, name: l.name })),
    adminLocale,
  };
}

/** Title in the admin's language and the locales (of the content's stores) without one. */
export function titleOf<T extends { localeCode: string; title: string | null }>(
  translations: T[],
  adminLocale: string,
  locales: { code: string }[],
) {
  const have = new Set(translations.filter((x) => x.title).map((x) => x.localeCode));
  return {
    title: pickLocalized(translations, adminLocale)?.title ?? '',
    missing: locales.map((l) => l.code).filter((c) => !have.has(c)),
  };
}

/** Reference data of the page / post editor. */
export async function articleContext(): Promise<ArticleContext> {
  const [{ stores, locales }, blocks, tags] = await Promise.all([
    contentContext(),
    call(
      adminApi().GET('/api/v1/admin/cms/blocks', {
        params: { query: { limit: 200, order: 'asc' } },
      }),
    ),
    call(adminApi().GET('/api/v1/admin/cms/tags')),
  ]);
  return { stores, locales, blocks: blocks.data.map((b) => b.identifier).sort(), tags };
}

/** Reference data of the block editor. */
export async function blockContext(): Promise<BlockContext> {
  const [{ stores, locales, adminLocale }, blocks, tree] = await Promise.all([
    contentContext(),
    call(
      adminApi().GET('/api/v1/admin/cms/blocks', {
        params: { query: { limit: 200, order: 'asc' } },
      }),
    ),
    getCategoryTree(),
  ]);
  return {
    stores,
    locales,
    tree,
    blocks: blocks.data.map((b) => b.identifier).sort(),
    nameLocale:
      locales.find((l) => l.code.toLowerCase().startsWith(adminLocale))?.code ?? locales[0]?.code,
  };
}

/** Readable names of block placement targets (id → title / name). */
export async function placementLabels(
  placements: { targetType: string; targetId: string }[],
  ctx: BlockContext,
): Promise<Record<string, string>> {
  const adminLocale = await getLocale();
  const ids = (type: string) => [
    ...new Set(placements.filter((p) => p.targetType === type).map((p) => p.targetId)),
  ];
  const out: Record<string, string> = {};
  const safe = <T>(p: Promise<T>) => p.catch(() => null);
  const [pages, posts, products] = await Promise.all([
    Promise.all(
      ids('PAGE').map((id) =>
        safe(call(adminApi().GET('/api/v1/admin/cms/pages/{id}', { params: { path: { id } } }))),
      ),
    ),
    Promise.all(
      ids('POST').map((id) =>
        safe(call(adminApi().GET('/api/v1/admin/cms/posts/{id}', { params: { path: { id } } }))),
      ),
    ),
    ids('PRODUCT').length
      ? call(
          adminApi().GET('/api/v1/admin/products', {
            params: {
              query: { ids: ids('PRODUCT').slice(0, 100), limit: 100, locale: ctx.nameLocale },
            },
          }),
        )
      : null,
  ]);
  for (const x of [...pages, ...posts])
    if (x) out[x.id] = pickLocalized(x.translations, adminLocale)?.title ?? x.id;
  for (const p of products?.data ?? []) out[p.id] = p.name ?? p.sku;
  for (const f of flatten(ctx.tree))
    out[f.id] = pickLocalized(f.node.translations, adminLocale)?.name ?? f.id;
  return out;
}
