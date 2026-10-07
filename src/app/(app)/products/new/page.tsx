import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { ProductForm } from '@/features/catalog/products/product-form';
import { PRODUCT_TYPES } from '@/features/catalog/products/product-meta';
import { getT } from '@/i18n/server';
import { requirePermission } from '@/server/auth';
import { productContext } from '@/server/product-context';

export const metadata: Metadata = { title: 'New product' };

export default async function NewProductPage({ searchParams }: PageProps<'/products/new'>) {
  await requirePermission('catalog:write');
  const [t, ctx, sp] = await Promise.all([getT(), productContext(), searchParams]);
  const type = PRODUCT_TYPES.find((x) => x === sp.type) ?? 'SIMPLE';
  return (
    <>
      <PageHeader
        title={t('prod.new')}
        breadcrumbs={[
          { label: t('nav.catalog') },
          { label: t('prod.title'), href: '/products' },
          { label: t('common.new') },
        ]}
      />
      <ProductForm product={null} initialType={type} ctx={ctx} canWrite />
    </>
  );
}
