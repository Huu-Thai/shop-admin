import 'server-only';
import createClient, { type Middleware } from 'openapi-fetch';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { apiBase, env } from './env';
import { getSession } from './session';
import type { components, paths } from './shop-api';

export type Schemas = components['schemas'];

/** An error answered by the shop API (Nest error body), safe to show to the admin. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
    readonly requestId?: string,
  ) {
    super(message);
  }
}

export function toApiError(status: number, body: unknown, requestId?: string): ApiError {
  const b = (body ?? {}) as { message?: string | string[]; error?: string };
  const list = Array.isArray(b.message) ? b.message : [];
  const message =
    (typeof b.message === 'string' ? b.message : list[0]) ??
    b.error ??
    `The shop API answered ${status}`;
  return new ApiError(status, message, list, requestId);
}

/**
 * Typed client for the shop admin API, authenticated as the signed-in admin. Server-side only:
 * Server Components, Server Actions and Route Handlers. A 401 means the session ended → sign in.
 */
export const adminApi = cache(() => {
  const client = createClient<paths>({
    baseUrl: env().SHOP_API_URL.replace(/\/+$/, ''),
    cache: 'no-store',
  });
  const auth: Middleware = {
    async onRequest({ request }) {
      const session = await getSession();
      if (session) request.headers.set('authorization', `Bearer ${session.accessToken}`);
      return request;
    },
  };
  client.use(auth);
  return client;
});

/**
 * Unwraps an openapi-fetch result: the data, or an ApiError. A 401 means the shop API no longer
 * accepts the session (revoked, user disabled): /api/auth/expired clears it and opens sign-in —
 * going straight to /login would bounce back here, since the cookie itself still looks valid.
 */
export async function call<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (response.status === 401) redirect('/api/auth/expired');
  if (!response.ok)
    throw toApiError(response.status, error, response.headers.get('x-request-id') ?? undefined);
  return data as T;
}

export { apiBase };
