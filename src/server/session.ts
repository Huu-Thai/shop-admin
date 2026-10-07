import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { env } from './env';
import {
  cookieOptions,
  openSession,
  sealSession,
  type Session,
  SESSION_COOKIE,
} from './session-crypto';

/** The current session (memoised per request). Pages only read it; proxy.ts refreshes it. */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  return openSession(store.get(SESSION_COOKIE)?.value, env().SESSION_SECRET);
});

/** Server Actions and Route Handlers only (Server Components can't set cookies). */
export async function writeSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    await sealSession(session, env().SESSION_SECRET),
    cookieOptions(session, env().NODE_ENV === 'production'),
  );
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
