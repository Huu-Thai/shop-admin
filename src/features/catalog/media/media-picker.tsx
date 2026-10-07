'use client';

import { Search, Upload } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { useI18n } from '@/i18n/client';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { ImageTile } from './image-tile';
import { ACCEPTED_IMAGES, type Image } from './upload';
import { useUploader } from './use-uploader';

const LIMIT = 24;

/**
 * Choose images from the library (or upload new ones) for a product, variant or category.
 * Images already attached are shown as selected and can't be picked twice.
 */
export function MediaPicker({
  open,
  onOpenChange,
  onPick,
  exclude = [],
  multiple = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (images: Image[]) => void;
  exclude?: string[];
  multiple?: boolean;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Image[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Image[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, pending } = useUploader((imgs) => {
    setItems((cur) => [...imgs, ...cur.filter((c) => !imgs.some((i) => i.id === c.id))]);
    setPicked((p) =>
      multiple ? [...p, ...imgs.filter((i) => !exclude.includes(i.id))] : imgs.slice(0, 1),
    );
  });

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(LIMIT), order: 'desc' });
      if (q) qs.set('search', q);
      const r = await gw<Schemas['ImageListDto']>(`images?${qs}`);
      setItems((cur) => (p === 1 ? r.data : [...cur, ...r.data]));
      setTotal(r.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void load(query.trim(), 1), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, query, load]);

  const toggle = (img: Image) =>
    setPicked((p) =>
      p.some((x) => x.id === img.id)
        ? p.filter((x) => x.id !== img.id)
        : multiple
          ? [...p, img]
          : [img],
    );

  return (
    <D.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setPicked([]);
      }}
    >
      <D.Portal>
        <D.Overlay className="animate-fade fixed inset-0 z-50 bg-ink-950/50 backdrop-blur-[2px]" />
        <D.Content className="animate-pop fixed top-1/2 left-1/2 z-50 flex h-[min(760px,calc(100dvh-32px))] w-[calc(100vw-32px)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <div className="mr-auto">
              <D.Title className="text-h4 text-fg">{t('media.pickTitle')}</D.Title>
              <D.Description className="text-small text-fg-muted">
                {t('media.pickHint')}
              </D.Description>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                aria-hidden
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
              />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('media.search')}
                aria-label={t('media.search')}
                className="focus-ring h-9 w-full rounded-md border border-border-strong bg-surface pr-3 pl-9 text-body text-fg placeholder:text-fg-subtle"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload />
              {t('media.upload')}
            </Button>
            <input
              ref={fileInput}
              type="file"
              hidden
              multiple={multiple}
              accept={ACCEPTED_IMAGES}
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                if (files.length) void upload(files);
                e.target.value = '';
              }}
            />
          </header>
          <div className="flex-1 overflow-y-auto p-5">
            {items.length || pending.length || loading ? (
              <>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {pending.map((name, i) => (
                    <li key={`p-${name}-${i}`} aria-busy="true">
                      <Skeleton className="aspect-square rounded-lg" />
                    </li>
                  ))}
                  {items.map((img) => {
                    const attached = exclude.includes(img.id);
                    return (
                      <li key={img.id} className={attached ? 'opacity-50' : undefined}>
                        <ImageTile
                          image={img}
                          label={img.originalFilename ?? img.id}
                          selected={attached || picked.some((p) => p.id === img.id)}
                          onClick={attached ? undefined : () => toggle(img)}
                        />
                      </li>
                    );
                  })}
                  {loading &&
                    Array.from({ length: items.length ? 5 : 10 }, (_, i) => (
                      <li key={`s-${i}`}>
                        <Skeleton className="aspect-square rounded-lg" />
                      </li>
                    ))}
                </ul>
                {items.length < total && !loading && (
                  <div className="mt-5 flex justify-center">
                    <Button variant="secondary" onClick={() => void load(query.trim(), page + 1)}>
                      {t('media.loadMore')}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState title={query ? t('list.noMatch') : t('media.empty')} />
            )}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-small text-fg-muted">{t('sets.selected', { n: picked.length })}</p>
            <div className="flex gap-2">
              <D.Close asChild>
                <Button variant="ghost">{t('common.cancel')}</Button>
              </D.Close>
              <Button
                disabled={!picked.length}
                onClick={() => {
                  onPick(picked);
                  setPicked([]);
                  onOpenChange(false);
                }}
              >
                {t('media.attach', { n: picked.length })}
              </Button>
            </div>
          </footer>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
