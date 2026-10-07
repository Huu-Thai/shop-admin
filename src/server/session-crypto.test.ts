import { describe, expect, it } from 'vitest';
import { openSession, sealSession, sessionFromTokens } from './session-crypto';

const secret = 'a'.repeat(32);
const session = {
  accessToken: 'access',
  accessExpiresAt: Date.now() + 60_000,
  refreshToken: 'refresh',
  refreshExpiresAt: Date.now() + 86_400_000,
};

describe('session cookie', () => {
  it('round-trips and is not readable without the secret', async () => {
    const sealed = await sealSession(session, secret);
    expect(sealed).not.toContain('access');
    expect(sealed.split('.')).toHaveLength(5); // compact JWE
    expect(await openSession(sealed, secret)).toEqual(session);
    expect(await openSession(sealed, 'b'.repeat(32))).toBeNull();
  });

  it('rejects tampered, missing and expired cookies', async () => {
    const sealed = await sealSession(session, secret);
    const parts = sealed.split('.');
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('AA') ? 'BB' : 'AA');
    expect(await openSession(parts.join('.'), secret)).toBeNull();
    expect(await openSession(undefined, secret)).toBeNull();
    expect(await openSession('garbage', secret)).toBeNull();
    const expired = await sealSession({ ...session, refreshExpiresAt: Date.now() - 1000 }, secret);
    expect(await openSession(expired, secret)).toBeNull();
  });

  it('builds a session from the shop token pair', () => {
    const now = 1_000_000;
    expect(
      sessionFromTokens(
        {
          accessToken: 'a',
          expiresIn: 900,
          refreshToken: 'r',
          refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        },
        now,
      ),
    ).toEqual({
      accessToken: 'a',
      accessExpiresAt: now + 900_000,
      refreshToken: 'r',
      refreshExpiresAt: Date.parse('2030-01-01T00:00:00.000Z'),
    });
  });
});
