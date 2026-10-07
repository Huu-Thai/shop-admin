'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';

/**
 * List state lives in the URL (shareable, back-button friendly). `set({ status: 'ENABLED' })`
 * replaces the given params, drops empty ones and resets to page 1 unless `page` is set.
 */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const href = useCallback(
    (next: Record<string, string | number | null | undefined>) => {
      const q = new URLSearchParams(params.toString());
      if (!('page' in next)) q.delete('page');
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === undefined || v === '') q.delete(k);
        else q.set(k, String(v));
      }
      const s = q.toString();
      return s ? `${pathname}?${s}` : pathname;
    },
    [params, pathname],
  );

  const set = useCallback(
    (next: Record<string, string | number | null | undefined>) =>
      startTransition(() => router.replace(href(next), { scroll: false })),
    [href, router],
  );

  return { params, href, set, pending };
}
