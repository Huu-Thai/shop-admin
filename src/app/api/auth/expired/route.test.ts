import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/auth/expired', () => {
  it('redirects to sign in on the browser’s own host and clears the session', () => {
    const res = GET();
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('/login');
    expect(res.headers.get('set-cookie')).toMatch(/^sa_session=;/);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
