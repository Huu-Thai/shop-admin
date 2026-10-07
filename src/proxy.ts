import { type NextRequest, NextResponse } from 'next/server';
import { refreshSession } from './server/refresh';
import {
  cookieOptions,
  openSession,
  REFRESH_LEEWAY_MS,
  sealSession,
  SESSION_COOKIE,
} from './server/session-crypto';

/** Pages anyone may open (the style guide is part of the theme's showcase). */
const PUBLIC = [
  /^\/login(\/|$)/,
  /^\/style-guide(\/|$)/,
  /^\/api\/health$/,
  /^\/api\/auth\/expired$/,
];

const isApi = (path: string) => path.startsWith('/api/');

function signIn(req: NextRequest, clearCookie: boolean): NextResponse {
  const res = isApi(req.nextUrl.pathname)
    ? NextResponse.json(
        { statusCode: 401, message: 'Your session has ended; sign in again' },
        { status: 401 },
      )
    : NextResponse.redirect(
        new URL(
          `/login?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`,
          req.url,
        ),
      );
  if (clearCookie) res.cookies.delete(SESSION_COOKIE);
  return res;
}

/**
 * Runs before every page and gateway request: sends visitors without a session to sign in, and
 * refreshes the access token shortly before it expires. This is the only place tokens are
 * refreshed — it can both set the new cookie and hand the fresh session to the rest of this request,
 * so a single-use refresh token is never replayed by a page that could not save the new one.
 */
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const secret = process.env.SESSION_SECRET ?? '';
  const apiUrl = process.env.SHOP_API_URL?.replace(/\/+$/, '');
  const session = await openSession(req.cookies.get(SESSION_COOKIE)?.value, secret);
  const isPublic = PUBLIC.some((p) => p.test(path));

  if (!session) {
    if (isPublic) return NextResponse.next();
    return signIn(req, !!req.cookies.get(SESSION_COOKIE));
  }
  if (path === '/login') return NextResponse.redirect(new URL('/', req.url));

  const now = Date.now();
  if (session.refreshExpiresAt <= now) return signIn(req, true);
  if (session.accessExpiresAt - now > REFRESH_LEEWAY_MS || !apiUrl) return NextResponse.next();

  const outcome = await refreshSession(`${apiUrl}/api/v1`, session);
  if (outcome.status === 'rejected') return signIn(req, true);
  if (outcome.status === 'unavailable') return NextResponse.next();

  const sealed = await sealSession(outcome.session, secret);
  // The rest of this request (pages, the gateway) reads the fresh session…
  req.cookies.set(SESSION_COOKIE, sealed);
  const headers = new Headers(req.headers);
  headers.set('cookie', req.cookies.toString());
  const res = NextResponse.next({ request: { headers } });
  // …and the browser stores it.
  res.cookies.set(
    SESSION_COOKIE,
    sealed,
    cookieOptions(outcome.session, process.env.NODE_ENV === 'production'),
  );
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|woff2?)$).*)',
  ],
};
