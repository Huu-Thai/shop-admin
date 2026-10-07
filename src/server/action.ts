import 'server-only';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { ApiError } from './api';
import { DEMO_REFUSAL, isDemo } from './env';

/** What every Server Action returns: data, or an error the UI can show next to the form. */
export type ActionResult<T = null> =
  { ok: true; data: T } | { ok: false; status: number; error: string; details: string[] };

/**
 * Runs a mutation against the shop API and turns its errors into an ActionResult. Redirects
 * (e.g. an expired session) still propagate. Paths in `revalidate` are refreshed on success.
 */
export async function attempt<T>(
  fn: () => Promise<T>,
  revalidate: string[] = [],
): Promise<ActionResult<T>> {
  if (isDemo()) return { ok: false, status: 403, error: DEMO_REFUSAL, details: [] };
  try {
    const data = await fn();
    for (const path of revalidate) revalidatePath(path);
    return { ok: true, data };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ApiError)
      return { ok: false, status: e.status, error: e.message, details: e.details };
    console.error(e);
    return {
      ok: false,
      status: 500,
      error: 'Something went wrong. Try again in a moment.',
      details: [],
    };
  }
}
