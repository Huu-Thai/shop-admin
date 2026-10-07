import { type Session, sessionFromTokens } from './session-crypto';

export type RefreshOutcome =
  | { status: 'refreshed'; session: Session }
  /** The shop refused the refresh token (expired, revoked, reused): sign in again. */
  | { status: 'rejected' }
  /** The shop could not be reached: keep the session, try again later. */
  | { status: 'unavailable' };

/**
 * Refresh tokens are single-use: replaying one revokes the whole session. Requests that arrive
 * together with the same expiring session share one refresh call.
 */
const inFlight = new Map<string, Promise<RefreshOutcome>>();

export function refreshSession(
  apiBase: string,
  session: Session,
  fetchImpl: typeof fetch = fetch,
): Promise<RefreshOutcome> {
  const existing = inFlight.get(session.refreshToken);
  if (existing) return existing;
  const run = (async (): Promise<RefreshOutcome> => {
    try {
      const res = await fetchImpl(`${apiBase}/admin/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
        cache: 'no-store',
      });
      if (res.status === 401 || res.status === 400 || res.status === 403)
        return { status: 'rejected' };
      if (!res.ok) return { status: 'unavailable' };
      return {
        status: 'refreshed',
        session: sessionFromTokens(await res.json()),
      };
    } catch {
      return { status: 'unavailable' };
    }
  })();
  inFlight.set(session.refreshToken, run);
  // Keep the result briefly so requests that read the old cookie a moment later reuse it.
  void run.finally(() => setTimeout(() => inFlight.delete(session.refreshToken), 30_000));
  return run;
}
