/** Browser-side calls to the admin API, through the gateway (`/api/gw/…`). */
export class GatewayError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}

export async function gw<T = unknown>(
  path: string,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const { body, headers, ...rest } = init;
  const isForm = body instanceof FormData;
  const res = await fetch(`/api/gw/${path.replace(/^\/+/, '')}`, {
    ...rest,
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      'x-shop-admin': '1',
      ...(body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  if (res.status === 401) {
    // A full navigation on purpose: /api/auth/expired is a route handler that clears the cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/api/auth/expired');
    throw new GatewayError(401, 'Your session has ended');
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const b = (data ?? {}) as { message?: string | string[] };
    const list = Array.isArray(b.message) ? b.message : [];
    throw new GatewayError(
      res.status,
      (typeof b.message === 'string' ? b.message : list[0]) ?? `Request failed (${res.status})`,
      list,
    );
  }
  return data as T;
}
