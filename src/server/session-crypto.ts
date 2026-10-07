import { EncryptJWT, jwtDecrypt } from 'jose';

/** What the encrypted session cookie holds. Never sent to the browser in readable form. */
export interface Session {
  accessToken: string;
  /** Epoch ms. */
  accessExpiresAt: number;
  refreshToken: string;
  /** Epoch ms; the cookie expires with it. */
  refreshExpiresAt: number;
}

export const SESSION_COOKIE = 'sa_session';
/** Access tokens are refreshed this long before they expire. */
export const REFRESH_LEEWAY_MS = 60_000;

const keys = new Map<string, Promise<Uint8Array>>();
function key(secret: string): Promise<Uint8Array> {
  let k = keys.get(secret);
  if (!k) {
    k = crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(secret))
      .then((d) => new Uint8Array(d));
    keys.set(secret, k);
  }
  return k;
}

export async function sealSession(session: Session, secret: string): Promise<string> {
  return new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(session.refreshExpiresAt / 1000))
    .encrypt(await key(secret));
}

/** The session, or null when the cookie is missing, tampered with or expired. */
export async function openSession(
  value: string | undefined,
  secret: string,
): Promise<Session | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtDecrypt(value, await key(secret), {
      keyManagementAlgorithms: ['dir'],
      contentEncryptionAlgorithms: ['A256GCM'],
    });
    const s = payload as unknown as Session;
    if (
      typeof s.accessToken !== 'string' ||
      typeof s.refreshToken !== 'string' ||
      typeof s.accessExpiresAt !== 'number' ||
      typeof s.refreshExpiresAt !== 'number'
    )
      return null;
    return {
      accessToken: s.accessToken,
      accessExpiresAt: s.accessExpiresAt,
      refreshToken: s.refreshToken,
      refreshExpiresAt: s.refreshExpiresAt,
    };
  } catch {
    return null;
  }
}

/** The shop's token pair (POST /admin/auth/login and /refresh) as a session. */
export function sessionFromTokens(
  t: {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  },
  now = Date.now(),
): Session {
  return {
    accessToken: t.accessToken,
    accessExpiresAt: now + t.expiresIn * 1000,
    refreshToken: t.refreshToken,
    refreshExpiresAt: new Date(t.refreshTokenExpiresAt).getTime(),
  };
}

export const cookieOptions = (session: Session, secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: 'lax' as const,
  path: '/',
  expires: new Date(session.refreshExpiresAt),
});
