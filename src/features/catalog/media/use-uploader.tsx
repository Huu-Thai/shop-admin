'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/client';
import { type Image, uploadImages } from './upload';

/** Upload state plus toasts for failures; calls `onUploaded` with the new images. */
export function useUploader(onUploaded?: (images: Image[]) => void) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState<string[]>([]);

  const upload = async (files: File[]) => {
    setPending((p) => [...p, ...files.map((f) => f.name)]);
    const results = await uploadImages(files, (o) =>
      setPending((p) => {
        const i = p.indexOf(o.file.name);
        return i < 0 ? p : [...p.slice(0, i), ...p.slice(i + 1)];
      }),
    );
    const ok = results.flatMap((r) => (r.image ? [r.image] : []));
    const failed = results.filter((r) => r.error);
    if (ok.length) toast.success(t('media.uploaded', { n: ok.length }));
    for (const f of failed)
      toast.error(t('media.uploadFailed', { name: f.file.name }), {
        description:
          f.error === 'type'
            ? t('media.err.type')
            : f.error === 'size'
              ? t('media.err.size')
              : f.error === 'network'
                ? t('media.err.network')
                : f.error,
      });
    if (ok.length) {
      onUploaded?.(ok);
      router.refresh();
    }
    return ok;
  };

  return { upload, pending };
}
