'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });

export async function createUser(body: Schemas['CreateAdminUserDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/users', { body })), ['/users']);
}
export async function updateUser(id: string, body: Schemas['UpdateAdminUserDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/users/{id}', { ...one(id), body })),
    ['/users'],
  );
}
export async function deleteUser(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/users/{id}', one(id)));
    return null;
  }, ['/users']);
}
/** Sets a new password for another admin (they're signed out everywhere). */
export async function resetUserPassword(id: string, newPassword: string) {
  return attempt(async () => {
    await call(
      adminApi().POST('/api/v1/admin/users/{id}/reset-password', {
        ...one(id),
        body: { newPassword },
      }),
    );
    return null;
  });
}

export async function createRole(body: Schemas['CreateRoleDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/roles', { body })),
    ['/users/roles', '/users'],
  );
}
export async function updateRole(id: string, body: Schemas['UpdateRoleDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/roles/{id}', { ...one(id), body })),
    ['/users/roles', '/users'],
  );
}
export async function deleteRole(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/roles/{id}', one(id)));
    return null;
  }, ['/users/roles']);
}

/** Creates a key; the secret is in the result and is never shown again. */
export async function createApiKey(body: Schemas['CreateApiKeyDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/api-keys', { body })),
    ['/users/api-keys'],
  );
}
export async function revokeApiKey(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/api-keys/{id}', one(id)));
    return null;
  }, ['/users/api-keys']);
}

/** The signed-in admin changes their own password (other sessions are signed out). */
export async function changeOwnPassword(body: Schemas['ChangePasswordDto']) {
  return attempt(async () => {
    await call(adminApi().POST('/api/v1/admin/auth/change-password', { body }));
    return null;
  });
}
