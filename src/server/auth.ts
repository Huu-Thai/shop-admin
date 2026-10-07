import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call, type Schemas } from './api';
import { getSession } from './session';

export type Me = Schemas['MeDto'];

/** The signed-in admin (roles, permissions), once per request; no session → sign in. */
export const getMe = cache(async (): Promise<Me> => {
  if (!(await getSession())) redirect('/login');
  return call(adminApi().GET('/api/v1/admin/auth/me'));
});

/** Guards a page or action; admins without the permission land on /forbidden. */
export async function requirePermission(permission: string): Promise<Me> {
  const me = await getMe();
  if (!hasPermission(me.permissions, permission))
    redirect(`/forbidden?permission=${encodeURIComponent(permission)}`);
  return me;
}
