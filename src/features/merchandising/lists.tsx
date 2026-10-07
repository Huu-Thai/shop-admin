'use client';

import { GalleryHorizontal, Images } from 'lucide-react';
import { useState } from 'react';
import { FilterSelect } from '@/components/ui/list-toolbar';
import { useI18n } from '@/i18n/client';
import type { Schemas } from '@/server/api';
import { ContentList, type ContentRow } from '../content/content-list';
import { MERCH_TABS } from '../content/tabs';
import { SliderSheet } from './slider-sheet';

interface ListProps {
  rows: ContentRow[];
  total: number;
  page: number;
  limit: number;
  stores: Schemas['StoreDto'][];
  canWrite: boolean;
}

export function BannersList({ placements, ...props }: ListProps & { placements: string[] }) {
  const { t } = useI18n();
  return (
    <ContentList
      {...props}
      title={t('ban.title')}
      description={t('ban.description')}
      crumbs={[
        { label: t('nav.content') },
        { label: t('nav.merchandising') },
        { label: t('ban.title') },
      ]}
      tabs={MERCH_TABS}
      newHref="/merchandising/new"
      newLabel={t('ban.new')}
      searchPlaceholder={t('ban.search')}
      empty={t('ban.empty')}
      emptyBody={t('ban.emptyBody')}
      icon={<Images />}
      extraFilters={
        placements.length > 0 && (
          <FilterSelect
            param="placement"
            label={t('ban.placement')}
            allLabel={t('ban.anyPlacement')}
            options={placements.map((p) => ({ value: p, label: p }))}
          />
        )
      }
    />
  );
}

export function SlidersList(props: ListProps) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <ContentList
        {...props}
        title={t('sld.title')}
        description={t('sld.description')}
        crumbs={[
          { label: t('nav.content') },
          { label: t('nav.merchandising') },
          { label: t('sld.title') },
        ]}
        tabs={MERCH_TABS}
        onNew={() => setCreating(true)}
        newLabel={t('sld.new')}
        searchPlaceholder={t('sld.search')}
        empty={t('sld.empty')}
        emptyBody={t('sld.emptyBody')}
        icon={<GalleryHorizontal />}
      />
      {creating && (
        <SliderSheet slider={null} stores={props.stores} onClose={() => setCreating(false)} />
      )}
    </>
  );
}
