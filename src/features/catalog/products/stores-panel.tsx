'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { SaveBar } from '@/components/ui/form-layout';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { stableJson } from '../shared';
import { setStoreOverride } from './actions';
import { VISIBILITIES, visibilityKey } from './product-meta';

type Override = { status: string | null; visibility: string | null };
const INHERIT = '__inherit';

/** Per-store status and visibility; "inherit" uses the product's own values. */
export function StoresPanel({
  product,
  websites,
  stores,
  canWrite,
}: {
  product: Schemas['ProductDto'];
  websites: Schemas['WebsiteDto'][];
  stores: Schemas['StoreDto'][];
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const initial: Record<string, Override> = Object.fromEntries(
    stores.map((s) => {
      const o = product.storeOverrides.find((x) => x.storeId === s.id);
      return [s.id, { status: o?.status ?? null, visibility: o?.visibility ?? null }];
    }),
  );
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = stableJson(value) !== stableJson(initial);
  const sold = websites.filter((w) => product.websiteIds.includes(w.id));

  const save = async () => {
    setSaving(true);
    try {
      for (const s of stores) {
        if (stableJson(value[s.id]) === stableJson(initial[s.id])) continue;
        const ok = await runAction(
          setStoreOverride(product.id, s.id, {
            status: value[s.id].status as Schemas['ProductStatus'] | null,
            visibility: value[s.id].visibility as Schemas['ProductVisibility'] | null,
          }),
        );
        if (!ok) return;
      }
      toast.success(t('common.saved'));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (!sold.length)
    return (
      <Card>
        <EmptyState title={t('stores.none')} description={t('stores.noneBody')} />
      </Card>
    );

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader title={t('stores.title')} description={t('stores.hint')} />
        <div className="mt-4">
          <Table>
            <THead>
              <tr>
                <TH>{t('stores.store')}</TH>
                <TH>{t('common.status')}</TH>
                <TH>{t('prod.visibility')}</TH>
              </tr>
            </THead>
            <TBody>
              {sold.flatMap((w) =>
                stores
                  .filter((s) => s.websiteId === w.id)
                  .map((s) => {
                    const v = value[s.id];
                    const overridden = v.status !== null || v.visibility !== null;
                    return (
                      <TR key={s.id}>
                        <TD>
                          <span className="block font-medium text-fg">{s.name}</span>
                          <span className="flex items-center gap-2 text-caption text-fg-muted">
                            {w.name} · <span className="font-mono">{s.code}</span>
                            {overridden && <Badge tone="info">{t('stores.overridden')}</Badge>}
                          </span>
                        </TD>
                        <TD>
                          <Select
                            value={v.status ?? INHERIT}
                            disabled={!canWrite}
                            onValueChange={(x) =>
                              setValue((all) => ({
                                ...all,
                                [s.id]: { ...v, status: x === INHERIT ? null : x },
                              }))
                            }
                          >
                            <SelectTrigger
                              aria-label={`${t('common.status')} · ${s.name}`}
                              className="h-9 w-56 [&>span]:truncate"
                            />
                            <SelectContent>
                              <SelectItem value={INHERIT}>
                                {t('stores.inherit', {
                                  value:
                                    product.status === 'ENABLED'
                                      ? t('common.enabled')
                                      : t('common.disabled'),
                                })}
                              </SelectItem>
                              <SelectItem value="ENABLED">{t('common.enabled')}</SelectItem>
                              <SelectItem value="DISABLED">{t('common.disabled')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TD>
                        <TD>
                          <Select
                            value={v.visibility ?? INHERIT}
                            disabled={!canWrite}
                            onValueChange={(x) =>
                              setValue((all) => ({
                                ...all,
                                [s.id]: { ...v, visibility: x === INHERIT ? null : x },
                              }))
                            }
                          >
                            <SelectTrigger
                              aria-label={`${t('prod.visibility')} · ${s.name}`}
                              className="h-9 w-72 [&>span]:truncate"
                            />
                            <SelectContent>
                              <SelectItem value={INHERIT}>
                                {t('stores.inherit', {
                                  value: t(visibilityKey(product.visibility)),
                                })}
                              </SelectItem>
                              {VISIBILITIES.map((x) => (
                                <SelectItem key={x} value={x}>
                                  {t(visibilityKey(x))}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TD>
                      </TR>
                    );
                  }),
              )}
            </TBody>
          </Table>
        </div>
      </Card>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          message={t('common.unsaved')}
          saveLabel={t('common.save')}
          discardLabel={t('common.discard')}
          onDiscard={() => setValue(initial)}
          onSave={save}
        />
      )}
    </>
  );
}
