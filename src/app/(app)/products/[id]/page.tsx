import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fromLinks } from '@/features/catalog/media/links';
import { BundlePanel } from '@/features/catalog/products/bundle-panel';
import { ImagesPanel } from '@/features/catalog/products/images-panel';
import { PricingStockPanel } from '@/features/catalog/products/pricing-stock-panel';
import { ProductForm } from '@/features/catalog/products/product-form';
import { ProductHeader } from '@/features/catalog/products/product-header';
import { type ProductTab, tabsFor } from '@/features/catalog/products/product-meta';
import { RelationsPanel } from '@/features/catalog/products/relations-panel';
import { StoresPanel } from '@/features/catalog/products/stores-panel';
import { VariantsPanel } from '@/features/catalog/products/variants-panel';
import { pickLocalized } from '@/features/catalog/shared';
import { hasPermission } from '@/lib/permissions';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { getPriceBooks, getSources } from '@/server/catalog';
import { productContext } from '@/server/product-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string) {
  if (!UUID.test(id)) notFound();
  try {
    return await call(adminApi().GET('/api/v1/admin/products/{id}', { params: { path: { id } } }));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: PageProps<'/products/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  return { title: p.translations[0]?.name ?? p.sku };
}

export default async function ProductPage({ params, searchParams }: PageProps<'/products/[id]'>) {
  const me = await requirePermission('catalog:read');
  const canWrite = hasPermission(me.permissions, 'catalog:write');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, ctx] = await Promise.all([load(id), productContext()]);
  const tabs = tabsFor(product.type);
  const tab = (tabs.find((x) => x === sp.tab) ?? 'details') as ProductTab;
  const editable = canWrite && !product.deletedAt;

  let body: React.ReactNode;
  switch (tab) {
    case 'images': {
      const links = await call(
        adminApi().GET('/api/v1/admin/products/{id}/images', { params: { path: { id } } }),
      );
      body = (
        <ImagesPanel
          productId={id}
          images={fromLinks(links)}
          configurable={product.type === 'CONFIGURABLE'}
          canWrite={editable}
        />
      );
      break;
    }
    case 'variants':
      body = <VariantsPanel product={product} attributes={ctx.attributes} canWrite={editable} />;
      break;
    case 'bundle':
      body = (
        <BundlePanel
          product={product}
          locales={ctx.locales}
          nameLocale={ctx.nameLocale}
          canWrite={editable}
        />
      );
      break;
    case 'pricing': {
      const [books, stock, movements, sources] = await Promise.all([
        getPriceBooks(),
        call(
          adminApi().GET('/api/v1/admin/inventory/stock', {
            params: { query: { productId: id, limit: 200 } },
          }),
        ),
        call(
          adminApi().GET('/api/v1/admin/inventory/movements', {
            params: { query: { productId: id, limit: 10, order: 'desc' } },
          }),
        ),
        getSources(),
      ]);
      const lists = await Promise.all(
        books.map((b) =>
          call(
            adminApi().GET('/api/v1/admin/price-books/{id}/entries', {
              params: { path: { id: b.id }, query: { productId: id, limit: 200 } },
            }),
          ),
        ),
      );
      body = (
        <PricingStockPanel
          product={product}
          books={books}
          entries={Object.fromEntries(books.map((b, i) => [b.id, lists[i].data]))}
          stock={stock.data}
          sources={sources}
          movements={movements.data}
          nameLocale={ctx.nameLocale}
          canWritePricing={!product.deletedAt && hasPermission(me.permissions, 'pricing:write')}
          canWriteStock={!product.deletedAt && hasPermission(me.permissions, 'inventory:write')}
        />
      );
      break;
    }
    case 'stores':
      body = (
        <StoresPanel
          product={product}
          websites={ctx.websites}
          stores={ctx.stores}
          canWrite={editable}
        />
      );
      break;
    case 'related': {
      const ids = [
        ...new Set([
          ...product.relations.related,
          ...product.relations.upsell,
          ...product.relations.crossSell,
        ]),
      ];
      const related = await Promise.all(
        ids.map((rid) =>
          call(
            adminApi().GET('/api/v1/admin/products/{id}', { params: { path: { id: rid } } }),
          ).catch(() => null),
        ),
      );
      const labels = Object.fromEntries(
        related.flatMap((r) =>
          r
            ? [
                [
                  r.id,
                  `${pickLocalized(r.translations, ctx.nameLocale ?? '')?.name ?? r.sku} · ${r.sku}`,
                ],
              ]
            : [],
        ),
      );
      body = (
        <RelationsPanel
          product={product}
          labels={labels}
          nameLocale={ctx.nameLocale}
          canWrite={editable}
        />
      );
      break;
    }
    default:
      body = (
        <ProductForm key={product.updatedAt} product={product} ctx={ctx} canWrite={editable} />
      );
  }

  return (
    <>
      <ProductHeader product={product} tab={tab} canWrite={canWrite} />
      {body}
    </>
  );
}
