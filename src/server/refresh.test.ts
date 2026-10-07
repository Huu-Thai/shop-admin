import { describe, expect, it, vi } from 'vitest';
import { refreshSession } from './refresh';

const tokens = {
  accessToken: 'new-access',
  expiresIn: 900,
  refreshToken: 'new-refresh',
  refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};
const session = (refreshToken: string) => ({
  accessToken: 'old',
  accessExpiresAt: Date.now(),
  refreshToken,
  refreshExpiresAt: Date.now() + 86_400_000,
});

describe('refreshSession', () => {
  it('sends one refresh for concurrent requests with the same token (single-use tokens)', async () => {
    const fetchImpl = vi.fn(async () => Response.json(tokens));
    const s = session('r-concurrent');
    const results = await Promise.all(
      [1, 2, 3].map(() => refreshSession('http://api', s, fetchImpl)),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api/admin/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'r-concurrent' }),
      }),
    );
    for (const r of results)
      expect(r).toMatchObject({ status: 'refreshed', session: { accessToken: 'new-access' } });
  });

  it('a refused token means sign in again; an outage keeps the session', async () => {
    expect(
      await refreshSession(
        'http://api',
        session('r-401'),
        async () => new Response(null, { status: 401 }),
      ),
    ).toEqual({ status: 'rejected' });
    expect(
      await refreshSession(
        'http://api',
        session('r-503'),
        async () => new Response(null, { status: 503 }),
      ),
    ).toEqual({ status: 'unavailable' });
    expect(
      await refreshSession('http://api', session('r-down'), async () => {
        throw new TypeError('fetch failed');
      }),
    ).toEqual({ status: 'unavailable' });
  });
});
