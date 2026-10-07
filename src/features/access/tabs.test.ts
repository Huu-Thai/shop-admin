import { describe, expect, it } from 'vitest';
import { byArea, togglePermission } from './tabs';

const all = [
  { key: 'catalog:read', area: 'catalog', description: '' },
  { key: 'catalog:write', area: 'catalog', description: '' },
  { key: 'orders:read', area: 'orders', description: '' },
];

describe('permission editing', () => {
  it('groups by area in order', () => {
    expect(byArea(all).map((g) => [g.area, g.perms.length])).toEqual([
      ['catalog', 2],
      ['orders', 1],
    ]);
  });

  it('adds and removes, expanding wildcards', () => {
    expect(togglePermission([], 'orders:read', true, all)).toEqual(['orders:read']);
    expect(togglePermission(['catalog:*'], 'catalog:write', false, all)).toEqual(['catalog:read']);
    expect(togglePermission(['*'], 'orders:read', false, all).sort()).toEqual([
      'catalog:read',
      'catalog:write',
    ]);
  });
});
