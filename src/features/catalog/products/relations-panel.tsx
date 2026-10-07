'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/form-layout';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { stableJson } from '../shared';
import { setRelations } from './actions';
import { typeKey } from './product-meta';
import { productSearch } from './product-search';

const KINDS = ['related', 'upsell', 'crossSell'] as const;
type Kind = (typeof KINDS)[number];

export function RelationsPanel({
  product,
  labels,
  nameLocale,
  canWrite,
}: {
  product: Schemas['ProductDto'];
  /** Names of the currently related products (by id). */
  labels: Record<string, string>;
  nameLocale?: string;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const initial = product.relations;
  const [value, setValue] = useState<Record<Kind, string[]>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const dirty = stableJson(value) !== stableJson(initial);
  const load = useMemo(
    () => productSearch({ nameLocale, exclude: [product.id], typeLabel: (ty) => t(typeKey(ty)) }),
    [nameLocale, product.id, t],
  );

  return (
    <>
      <Card>
        <CardHeader title={t('rel.title')} description={t('rel.hint')} />
        <CardBody className="grid gap-6 pt-4">
          {KINDS.map((k) => (
            <div key={k} className="grid gap-1.5">
              <Label htmlFor={`rel-${k}`}>{t(`rel.${k}` as MessageKey)}</Label>
              <p className="-mt-1 text-small text-fg-muted">{t(`rel.${k}.hint` as MessageKey)}</p>
              <Combobox
                id={`rel-${k}`}
                multiple
                value={value[k]}
                onChange={(ids) => setValue((v) => ({ ...v, [k]: ids }))}
                load={load}
                labels={labels}
                disabled={!canWrite}
                placeholder={t('rel.placeholder')}
                searchPlaceholder={t('prod.search')}
                emptyText={t('common.noResults')}
              />
            </div>
          ))}
        </CardBody>
      </Card>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          message={t('common.unsaved')}
          saveLabel={t('common.save')}
          discardLabel={t('common.discard')}
          onDiscard={() => setValue({ ...initial })}
          onSave={async () => {
            setSaving(true);
            const ok = await runAction(setRelations(product.id, value), {
              success: t('common.saved'),
            });
            setSaving(false);
            if (ok) router.refresh();
          }}
        />
      )}
    </>
  );
}
