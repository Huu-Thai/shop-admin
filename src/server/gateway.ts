import { type Session } from './session-crypto';

/** Header the admin's own scripts send on every mutation; other sites can't send it without CORS. */
export const GATEWAY_HEADER = 'x-shop-admin';

/** Path segments arrive decoded; `%` is refused so `%2e%2e` can't become `..` upstream. */
const SEGMENT = /^[A-Za-z0-9._~:@-]+$/;
const FORWARD_REQUEST = [
  'accept',
  'accept-language',
  'content-type',
  'idempotency-key',
  'if-match',
  'x-request-id',
];
const FORWARD_RESPONSE = [
  'content-type',
  'content-disposition',
  'content-length',
  'etag',
  'x-request-id',
  'retry-after',
];
const SAFE_METHODS = new Set(['GET', 'HEAD']);

export interface GatewayDeps {
  apiBase: string;
  session: Session | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Demo mode: only reads pass. */
  readOnly?: boolean;
}

const problem = (status: number, message: string) =>
  Response.json(
    { statusCode: status, message },
    { status, headers: { 'cache-control': 'no-store' } },
  );

/** Same-origin check for mutations (CSRF): the custom header and, when sent, matching Origin. */
export function checkOrigin(req: Request): string | null {
  if (SAFE_METHODS.has(req.method)) return null;
  if (req.headers.get(GATEWAY_HEADER) !== '1') return `Mutations need the ${GATEWAY_HEADER} header`;
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return 'Cross-site request refused';
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return 'Cross-site request refused';
  return null;
}

/**
 * The API gateway (backend-for-frontend): browser code calls `/api/gw/<path>` and the request is
 * forwarded to the shop's `/api/v1/admin/<path>` with the session's access token. Only the admin
 * API is reachable, only listed headers pass in either direction, and the token never reaches the
 * browser.
 */
export async function forward(
  req: Request,
  segments: string[],
  deps: GatewayDeps,
): Promise<Response> {
  if (!segments.length || segments.some((s) => !SEGMENT.test(s) || s === '.' || s === '..'))
    return problem(400, 'Invalid API path');
  const refused = checkOrigin(req);
  if (refused) return problem(403, refused);
  if (!deps.session) return problem(401, 'Your session has ended; sign in again');
  if (deps.readOnly && !SAFE_METHODS.has(req.method))
    return problem(403, 'This is a read-only demo: changes are switched off.');

  const incoming = new URL(req.url);
  const admin = new URL(`${deps.apiBase}/admin/`);
  const target = new URL(`${segments.join('/')}${incoming.search}`, admin);
  // Defence in depth: whatever the URL parser normalised, the target stays inside the admin API.
  if (target.origin !== admin.origin || !target.pathname.startsWith(admin.pathname))
    return problem(400, 'Invalid API path');
  const headers = new Headers();
  for (const h of FORWARD_REQUEST) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set('authorization', `Bearer ${deps.session.accessToken}`);
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  let upstream: Response;
  try {
    upstream = await (deps.fetchImpl ?? fetch)(target, {
      method: req.method,
      headers,
      body: SAFE_METHODS.has(req.method) ? undefined : req.body,
      // @ts-expect-error -- Node fetch needs half duplex to stream a request body
      duplex: 'half',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(deps.timeoutMs ?? 60_000),
    });
  } catch (e) {
    const timeout = (e as Error).name === 'TimeoutError';
    return problem(
      timeout ? 504 : 502,
      timeout ? 'The shop API did not answer in time' : 'The shop API is unreachable',
    );
  }
  const out = new Headers({ 'cache-control': 'no-store' });
  for (const h of FORWARD_RESPONSE) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
