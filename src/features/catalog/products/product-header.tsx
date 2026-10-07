'use client';

import { RotateCcw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { cn } from '@/lib/cn';
import type { Schemas } from '@/server/api';
import { pickLocalized } from '../shared';
import { deleteProduct, restoreProduct } from './actions';
import { type ProductTab, tabsFor, TypeBadge, typeKey } from './product-meta';

export function ProductHeader({
  product,
  tab,
  canWrite,
}: {
  product: Schemas['ProductDto'];
  tab: ProductTab;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const name = pickLocalized(product.translations, locale)?.name ?? product.sku;
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('nav.catalog') },
          { label: t('prod.title'), href: '/products' },
          { label: product.sku },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {name}
            <TypeBadge type={product.type} label={t(typeKey(product.type))} />
            {product.deletedAt ? (
              <Badge tone="danger" dot>
                {t('prod.deleted')}
              </Badge>
            ) : (
              <Badge tone={product.status === 'ENABLED' ? 'success' : 'neutral'} dot>
                {product.status === 'ENABLED' ? t('common.enabled') : t('common.disabled')}
              </Badge>
            )}
          </span>
        }
        description={<span className="font-mono">{product.sku}</span>}
        actions={
          canWrite &&
          (product.deletedAt ? (
            <Button
              variant="secondary"
              onClick={async () => {
                if (await runAction(restoreProduct(product.id), { success: t('prod.restored') }))
                  router.refresh();
              }}
            >
              <RotateCcw />
              {t('common.restore')}
            </Button>
          ) : (
            <Confirm
              trigger={
                <Button variant="ghost" className="text-danger-fg">
                  <Trash2 />
                  {t('common.delete')}
                </Button>
              }
              title={t('prod.deleteTitle', { sku: product.sku })}
              description={t('prod.deleteBody')}
              confirmLabel={t('common.delete')}
              cancelLabel={t('common.cancel')}
              onConfirm={async () => {
                const ok = await runAction(deleteProduct(product.id), {
                  success: t('prod.deletedToast'),
                });
                if (ok !== undefined) router.push('/products');
                return ok !== undefined;
              }}
            />
          ))
        }
      />
      {product.deletedAt && (
        <p
          role="status"
          className="mb-6 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-small text-danger-fg"
        >
          {t('prod.deletedBanner')}
        </p>
      )}
      <nav
        aria-label={t('prod.sections')}
        className="-mt-2 mb-6 flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabsFor(product.type).map((tb) => (
          <Link
            key={tb}
            href={
              tb === 'details' ? `/products/${product.id}` : `/products/${product.id}?tab=${tb}`
            }
            scroll={false}
            aria-current={tb === tab ? 'page' : undefined}
            className={cn(
              'focus-ring relative -mb-px shrink-0 rounded-t-md px-3 py-2.5 text-body font-medium transition-colors',
              tb === tab ? 'text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {t(`prod.tab.${tb}` as MessageKey)}
            {tb === 'variants' && (
              <span className="tabular ml-1.5 text-caption text-fg-subtle">
                {product.variants.length}
              </span>
            )}
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary',
                tb === tab ? 'opacity-100' : 'opacity-0',
              )}
            />
          </Link>
        ))}
      </nav>
    </>
  );
}
