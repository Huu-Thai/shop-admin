import { describe, expect, it, vi } from 'vitest';
import { checkOrigin, forward, GATEWAY_HEADER } from './gateway';

const session = {
  accessToken: 'secret-access',
  accessExpiresAt: Date.now() + 60_000,
  refreshToken: 'secret-refresh',
  refreshExpiresAt: Date.now() + 86_400_000,
};
const base = 'http://shop:3000/api/v1';
const upstreamOk = () =>
  vi.fn<typeof fetch>(async () =>
    Response.json(
      { ok: true },
      { headers: { 'set-cookie': 'evil=1', 'x-request-id': 'req-1', server: 'nest' } },
    ),
  );

const req = (method: string, url: string, headers: Record<string, string> = {}, body?: string) =>
  new Request(`http://admin.test${url}`, {
    method,
    headers: { host: 'admin.test', ...headers },
    body,
  });

describe('gateway forward', () => {
  it('forwards to the admin API with the bearer token and only allow-listed headers', async () => {
    const fetchImpl = upstreamOk();
    const res = await forward(
      req('GET', '/api/gw/orders?limit=5', {
        cookie: 'sa_session=x',
        'accept-language': 'vi',
        'x-evil': '1',
      }),
      ['orders'],
      { apiBase: base, session, fetchImpl },
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe('http://shop:3000/api/v1/admin/orders?limit=5');
    const sent = new Headers(init!.headers);
    expect(sent.get('authorization')).toBe('Bearer secret-access');
    expect(sent.get('accept-language')).toBe('vi');
    expect(sent.get('cookie')).toBeNull();
    expect(sent.get('x-evil')).toBeNull();
    expect(init!.redirect).toBe('manual');
    // Response: no cookies or server details leak back; never cached.
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('server')).toBeNull();
    expect(res.headers.get('x-request-id')).toBe('req-1');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it.each([
    [['..', 'store', 'carts']],
    [['%2e%2e', 'store']],
    [['orders', '.']],
    [['a/b']],
    [['a?b']],
    [[]],
  ])('refuses path %j without calling the API', async (segments) => {
    const fetchImpl = upstreamOk();
    const res = await forward(req('GET', '/api/gw/x'), segments, {
      apiBase: base,
      session,
      fetchImpl,
    });
    expect(res.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('needs a session', async () => {
    const res = await forward(req('GET', '/api/gw/orders'), ['orders'], {
      apiBase: base,
      session: null,
      fetchImpl: upstreamOk(),
    });
    expect(res.status).toBe(401);
  });

  it('streams mutation bodies when the CSRF header is present', async () => {
    const fetchImpl = upstreamOk();
    const res = await forward(
      req(
        'POST',
        '/api/gw/orders/1/notes',
        { [GATEWAY_HEADER]: '1', origin: 'http://admin.test', 'content-type': 'application/json' },
        '{"message":"hi"}',
      ),
      ['orders', '1', 'notes'],
      { apiBase: base, session, fetchImpl },
    );
    expect(res.status).toBe(200);
    const init = fetchImpl.mock.calls[0][1]!;
    expect(init.method).toBe('POST');
    expect(await new Response(init.body).text()).toBe('{"message":"hi"}');
  });

  it('refuses every change in read-only demo mode, but lets reads through', async () => {
    const fetchImpl = upstreamOk();
    const write = await forward(
      req('DELETE', '/api/gw/products/1', { [GATEWAY_HEADER]: '1', origin: 'http://admin.test' }),
      ['products', '1'],
      { apiBase: base, session, fetchImpl, readOnly: true },
    );
    expect(write.status).toBe(403);
    expect((await write.json()).message).toMatch(/read-only demo/);
    const read = await forward(req('GET', '/api/gw/products'), ['products'], {
      apiBase: base,
      session,
      fetchImpl,
      readOnly: true,
    });
    expect(read.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('maps timeouts and outages to 504 / 502', async () => {
    const timeout = vi.fn(async () => {
      throw Object.assign(new Error('t'), { name: 'TimeoutError' });
    });
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const r1 = await forward(req('GET', '/api/gw/orders'), ['orders'], {
      apiBase: base,
      session,
      fetchImpl: timeout,
    });
    const r2 = await forward(req('GET', '/api/gw/orders'), ['orders'], {
      apiBase: base,
      session,
      fetchImpl: down,
    });
    expect([r1.status, r2.status]).toEqual([504, 502]);
  });
});

describe('checkOrigin (CSRF)', () => {
  it('lets reads through', () => {
    expect(checkOrigin(req('GET', '/api/gw/orders'))).toBeNull();
  });
  it('refuses mutations without the header, from another origin or another site', () => {
    expect(checkOrigin(req('POST', '/api/gw/orders'))).toMatch(/header/);
    expect(
      checkOrigin(
        req('POST', '/api/gw/orders', { [GATEWAY_HEADER]: '1', origin: 'https://evil.example' }),
      ),
    ).toMatch(/Cross-site/);
    expect(
      checkOrigin(
        req('DELETE', '/api/gw/orders', { [GATEWAY_HEADER]: '1', 'sec-fetch-site': 'cross-site' }),
      ),
    ).toMatch(/Cross-site/);
    expect(
      checkOrigin(
        req('PATCH', '/api/gw/orders', {
          [GATEWAY_HEADER]: '1',
          origin: 'http://admin.test',
          'sec-fetch-site': 'same-origin',
        }),
      ),
    ).toBeNull();
  });
});
