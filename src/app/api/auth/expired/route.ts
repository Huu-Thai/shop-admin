import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/server/session-crypto';

/** The shop API rejected the session: forget it and sign in again (only ever clears this cookie). */
export function GET() {
  // A relative Location: behind a proxy, `req.url` carries the server's bind address
  // (http://0.0.0.0:3000), not the host the browser used.
  const res = new NextResponse(null, { status: 307, headers: { location: '/login' } });
  res.cookies.delete(SESSION_COOKIE);
  res.headers.set('cache-control', 'no-store');
  return res;
}
