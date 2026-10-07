'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeNext } from '@/lib/permissions';
import { apiBase } from './env';
import { sessionFromTokens } from './session-crypto';
import { clearSession, getSession, writeSession } from './session';

export interface SignInState {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  email?: string;
}

const credentials = z.object({
  email: z.email('Enter a valid e-mail address').max(254),
  password: z.string().min(1, 'Enter your password').max(256),
});

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const parsed = credentials.safeParse({
    email: String(form.get('email') ?? '').trim(),
    password: String(form.get('password') ?? ''),
  });
  const email = String(form.get('email') ?? '');
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    return {
      email,
      fieldErrors: { email: f.email?.[0], password: f.password?.[0] },
    };
  }
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
  } catch {
    return {
      email,
      error: 'The shop API is unreachable. Try again in a moment.',
    };
  }
  if (res.status === 401)
    return {
      email,
      error: 'Incorrect e-mail or password, or the account is locked.',
    };
  if (res.status === 429)
    return {
      email,
      error: 'Too many attempts. Wait a minute, then try again.',
    };
  if (!res.ok) return { email, error: `Sign-in failed (${res.status}). Try again.` };
  await writeSession(sessionFromTokens(await res.json()));
  redirect(safeNext(form.get('next')));
}

export async function signOut(everywhere = false): Promise<void> {
  const session = await getSession();
  if (session)
    await fetch(`${apiBase()}/admin/auth/logout${everywhere ? '?everywhere=true' : ''}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    }).catch(() => undefined);
  await clearSession();
  redirect('/login');
}
