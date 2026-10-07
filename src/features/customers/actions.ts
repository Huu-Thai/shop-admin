'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });
const customerPaths = (id?: string) => ['/customers', ...(id ? [`/customers/${id}`] : [])];

export async function createCustomer(body: Schemas['CreateCustomerDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/customers', { body })), customerPaths());
}
export async function updateCustomer(id: string, body: Schemas['UpdateCustomerDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/customers/{id}', { ...one(id), body })),
    customerPaths(id),
  );
}
/** GDPR erasure: the account with its addresses, sessions and points. Orders keep their copy. */
export async function deleteCustomer(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/customers/{id}', one(id)));
    return null;
  }, customerPaths());
}
export async function signOutCustomer(id: string) {
  return attempt(async () => {
    await call(adminApi().POST('/api/v1/admin/customers/{id}/logout', one(id)));
    return null;
  }, customerPaths(id));
}

const address = (id: string, addressId: string) => ({ params: { path: { id, addressId } } });

export async function createAddress(id: string, body: Schemas['CreateAddressDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/customers/{id}/addresses', { ...one(id), body })),
    customerPaths(id),
  );
}
export async function updateAddress(
  id: string,
  addressId: string,
  body: Schemas['UpdateAddressDto'],
) {
  return attempt(
    () =>
      call(
        adminApi().PATCH('/api/v1/admin/customers/{id}/addresses/{addressId}', {
          ...address(id, addressId),
          body,
        }),
      ),
    customerPaths(id),
  );
}
export async function deleteAddress(id: string, addressId: string) {
  return attempt(async () => {
    await call(
      adminApi().DELETE(
        '/api/v1/admin/customers/{id}/addresses/{addressId}',
        address(id, addressId),
      ),
    );
    return null;
  }, customerPaths(id));
}

const groupPaths = ['/customers/groups'];

export async function createGroup(body: Schemas['CreateCustomerGroupDto']) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/customer-groups', { body })),
    groupPaths,
  );
}
export async function updateGroup(id: string, body: Schemas['UpdateCustomerGroupDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/customer-groups/{id}', { ...one(id), body })),
    groupPaths,
  );
}
export async function deleteGroup(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/customer-groups/{id}', one(id)));
    return null;
  }, groupPaths);
}
