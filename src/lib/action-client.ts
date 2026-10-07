'use client';

import { toast } from 'sonner';
import type { ActionResult } from '@/server/action';

/**
 * Awaits a Server Action and reports the outcome as a toast. Returns the data, or undefined on
 * failure (the API's message and validation details are shown to the admin).
 */
export async function runAction<T>(
  promise: Promise<ActionResult<T>>,
  messages: { success?: string; error?: string } = {},
): Promise<T | undefined> {
  const r = await promise;
  if (r.ok) {
    if (messages.success) toast.success(messages.success);
    return r.data;
  }
  toast.error(messages.error ?? r.error, {
    description:
      r.details.length > 1 || (messages.error && r.details.length)
        ? r.details.slice(0, 5).join(' · ')
        : messages.error
          ? r.error
          : undefined,
  });
  return undefined;
}
