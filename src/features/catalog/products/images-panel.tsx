'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { SaveBar } from '@/components/ui/form-layout';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import { ImageLinksEditor } from '../media/image-links-editor';
import { type LinkedImage, toLinks } from '../media/links';
import { stableJson } from '../shared';
import { setProductImages } from './actions';

export function ImagesPanel({
  productId,
  images: initial,
  configurable,
  canWrite,
}: {
  productId: string;
  images: LinkedImage[];
  configurable: boolean;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [images, setImages] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = stableJson(toLinks(images)) !== stableJson(toLinks(initial));
  return (
    <>
      <Card>
        <CardHeader
          title={t('cat.images')}
          description={
            configurable ? `${t('pimg.hint')} ${t('pimg.variantsHint')}` : t('pimg.hint')
          }
        />
        <CardBody className="pt-4">
          <ImageLinksEditor value={images} onChange={setImages} disabled={!canWrite} />
        </CardBody>
      </Card>
      {canWrite && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          message={t('common.unsaved')}
          saveLabel={t('common.save')}
          discardLabel={t('common.discard')}
          onDiscard={() => setImages(initial)}
          onSave={async () => {
            setSaving(true);
            const ok = await runAction(setProductImages(productId, toLinks(images)), {
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
