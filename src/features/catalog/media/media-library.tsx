'use client';

import { ImageIcon, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dropzone } from '@/components/ui/dropzone';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { useI18n } from '@/i18n/client';
import type { ShopLocale } from '../locale-switcher';
import { ImageSheet } from './image-sheet';
import { ImageTile } from './image-tile';
import { ACCEPTED_IMAGES, type Image } from './upload';
import { useUploader } from './use-uploader';

export function MediaLibrary({
  images,
  total,
  page,
  limit,
  locales,
  canWrite,
}: {
  images: Image[];
  total: number;
  page: number;
  limit: number;
  locales: ShopLocale[];
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const [showDrop, setShowDrop] = useState(false);
  const [selected, setSelected] = useState<Image | null>(null);
  const [key, setKey] = useState(0);
  const { upload, pending } = useUploader();

  return (
    <>
      <PageHeader
        title={t('media.title')}
        description={t('media.description')}
        breadcrumbs={[{ label: t('nav.catalog') }, { label: t('media.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => setShowDrop((s) => !s)} aria-expanded={showDrop}>
              <Upload />
              {t('media.upload')}
            </Button>
          )
        }
      />
      {canWrite && (showDrop || (!images.length && total === 0)) && (
        <Dropzone
          className="mb-6"
          accept={ACCEPTED_IMAGES}
          onFiles={upload}
          title={t('media.dropTitle')}
          hint={t('media.dropHint')}
        />
      )}
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('media.search')} />
        </ListToolbar>
        {images.length || pending.length ? (
          <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:p-5 lg:grid-cols-4 xl:grid-cols-6">
            {pending.map((name, i) => (
              <li key={`p-${name}-${i}`} aria-busy="true" className="grid gap-2">
                <Skeleton className="aspect-square rounded-lg" />
                <span className="truncate text-caption text-fg-muted">{name}</span>
              </li>
            ))}
            {images.map((img) => (
              <li key={img.id}>
                <ImageTile
                  image={img}
                  label={img.originalFilename ?? img.id}
                  onClick={() => {
                    setSelected(img);
                    setKey((k) => k + 1);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<ImageIcon />}
            title={total === 0 ? t('media.empty') : t('list.noMatch')}
            description={total === 0 ? t('media.emptyBody') : undefined}
          />
        )}
        {total > limit && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      {selected && (
        <ImageSheet
          key={key}
          image={selected}
          locales={locales}
          canWrite={canWrite}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </>
  );
}
