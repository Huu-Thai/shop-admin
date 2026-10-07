'use client';

import { GatewayError, gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';

export type Image = Schemas['ImageDto'];

export const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/avif,image/gif';
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export interface UploadOutcome {
  file: File;
  image?: Image;
  error?: string;
}

/** Checks a file before sending it (the API re-checks the bytes). */
export function precheck(file: File): string | undefined {
  if (!ACCEPTED_IMAGES.split(',').includes(file.type)) return 'type';
  if (file.size > MAX_UPLOAD_BYTES) return 'size';
  return undefined;
}

/** Uploads through the gateway, three at a time; identical files come back as the same image. */
export async function uploadImages(
  files: File[],
  onDone?: (o: UploadOutcome) => void,
): Promise<UploadOutcome[]> {
  const out: UploadOutcome[] = [];
  const queue = [...files];
  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      let o: UploadOutcome;
      const bad = precheck(file);
      if (bad) o = { file, error: bad };
      else {
        try {
          const body = new FormData();
          body.append('file', file);
          o = { file, image: await gw<Image>('images', { method: 'POST', body }) };
        } catch (e) {
          o = { file, error: e instanceof GatewayError ? e.message : 'network' };
        }
      }
      out.push(o);
      onDone?.(o);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return out;
}

export function formatBytes(n: number, locale: string): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: i ? 1 : 0 }).format(v)} ${units[i]}`;
}
