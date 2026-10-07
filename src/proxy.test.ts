import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxy } from './proxy';
import { openSession, sealSession, SESSION_COOKIE } from './server/session-crypto';

const secret = 'test-secret-'.padEnd(40, 'x');
const hour = 3_600_000;

const cookieFor = (overrides: Partial<Parameters<typeof sealSession>[0]> = {}) =>
  sealSession(
    {
      accessToken: 'a1',
      accessExpiresAt: Date.now() + hour,
      refreshToken: `r-${Math.random()}`,
      refreshExpiresAt: Date.now() + 24 * hour,
      ...overrides,
    },
    secret,
  );

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://admin.test${path}`, {
    headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {},
  });

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', secret);
  vi.stubEnv('SHOP_API_URL', 'http://shop:3000');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('proxy', () => {
  it('sends visitors without a session to sign in, keeping where they were going', async () => {
    const res = await proxy(request('/orders?status=PAID'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://admin.test/login?next=%2Forders%3Fstatus%3DPAID',
    );
  });

  it('answers 401 JSON for API calls and clears a bad cookie', async () => {
    const res = await proxy(request('/api/gw/orders', 'tampered'));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toMatch(new RegExp(`${SESSION_COOKIE}=;`));
  });

  it('lets public pages through and moves signed-in admins off /login', async () => {
    expect((await proxy(request('/style-guide'))).headers.get('x-middleware-next')).toBe('1');
    expect((await proxy(request('/login'))).headers.get('x-middleware-next')).toBe('1');
    const res = await proxy(request('/login', await cookieFor()));
    expect(res.headers.get('location')).toBe('http://admin.test/');
  });

  it('passes a fresh session through without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await proxy(request('/', await cookieFor()));
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refreshes an expiring token: new cookie for the browser and for this request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          accessToken: 'a2',
          expiresIn: 900,
          refreshToken: 'r2',
          refreshTokenExpiresAt: new Date(Date.now() + 24 * hour).toISOString(),
        }),
      ),
    );
    const res = await proxy(
      request('/', await cookieFor({ accessExpiresAt: Date.now() + 10_000 })),
    );
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    const value = /sa_session=([^;]+)/.exec(setCookie)![1];
    expect(await openSession(value, secret)).toMatchObject({
      accessToken: 'a2',
      refreshToken: 'r2',
    });
    // the rewritten request carries the new cookie to pages and the gateway
    expect(res.headers.get('x-middleware-override-headers')).toContain('cookie');
    expect(res.headers.get('x-middleware-request-cookie')).toContain(value);
  });

  it('signs out when the refresh token is refused or already expired', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    const refused = await proxy(request('/', await cookieFor({ accessExpiresAt: Date.now() - 1 })));
    expect(refused.headers.get('location')).toMatch(/\/login/);
    const expired = await proxy(
      request(
        '/',
        await cookieFor({ accessExpiresAt: Date.now() - 1, refreshExpiresAt: Date.now() + 1000 }),
      ),
    );
    expect(expired.headers.get('location')).toMatch(/\/login/);
  });

  it('keeps the session when the API is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    const res = await proxy(request('/', await cookieFor({ accessExpiresAt: Date.now() + 5_000 })));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});
