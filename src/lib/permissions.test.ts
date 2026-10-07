import { describe, expect, it } from 'vitest';
import { hasPermission, safeNext } from './permissions';

describe('hasPermission', () => {
  it('matches exact, area wildcard and super-admin grants', () => {
    expect(hasPermission(['orders:read'], 'orders:read')).toBe(true);
    expect(hasPermission(['orders:*'], 'orders:write')).toBe(true);
    expect(hasPermission(['*'], 'settings:write')).toBe(true);
    expect(hasPermission(['orders:read'], 'orders:write')).toBe(false);
    expect(hasPermission(['catalog:*'], 'orders:read')).toBe(false);
    expect(hasPermission([], 'orders:read')).toBe(false);
  });
});

describe('safeNext', () => {
  it.each([
    ['/orders?status=PAID', '/orders?status=PAID'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['javascript:alert(1)', '/'],
    [undefined, '/'],
    [['/a'], '/'],
  ])('%j → %j', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe('canGrant', () => {
  it('only hands out what the holder has', async () => {
    const { canGrant } = await import('./permissions');
    expect(canGrant(['*'], '*')).toBe(true);
    expect(canGrant(['catalog:*'], 'catalog:write')).toBe(true);
    expect(canGrant(['catalog:*'], 'catalog:*')).toBe(true);
    expect(canGrant(['catalog:read', 'catalog:write'], 'catalog:*')).toBe(false);
    expect(canGrant(['catalog:read'], 'orders:read')).toBe(false);
    expect(canGrant(['admin-users:write'], '*')).toBe(false);
  });
});
