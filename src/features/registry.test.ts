import { Ticket } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { applyExtensions, isActive, navFor, sections } from './registry';

describe('navigation registry', () => {
  it('shows only what the admin may open', () => {
    const ids = (perms: string[]) => navFor(perms).flatMap((s) => s.items.map((i) => i.id));
    // Settings (your own account) is open to every admin.
    expect(ids([])).toEqual(['dashboard', 'settings']);
    expect(ids(['orders:read'])).toEqual([
      'dashboard',
      'orders',
      'payments',
      'shipping',
      'settings',
    ]);
    expect(ids(['*']).length).toBe(sections.flatMap((s) => s.items).length);
    expect(navFor([]).map((s) => s.id)).toEqual(['overview', 'system']);
  });

  it('is serializable for the client (no icon components)', () => {
    expect(JSON.parse(JSON.stringify(navFor(['*'])))).toEqual(navFor(['*']));
  });

  it('extensions add sections and items or replace built-ins', () => {
    const out = applyExtensions(sections, [
      {
        section: 'sales',
        item: { id: 'returns', label: 'Returns', href: '/returns', icon: Ticket, ready: true },
      },
      {
        section: 'sales',
        item: { id: 'orders', label: 'My orders', href: '/my-orders', icon: Ticket, ready: true },
      },
      {
        section: 'reports',
        sectionLabel: 'Reports',
        item: { id: 'r', label: 'R', href: '/r', icon: Ticket },
      },
    ]);
    const sales = out.find((s) => s.id === 'sales')!;
    expect(sales.items.map((i) => i.id)).toEqual(['orders', 'payments', 'shipping', 'returns']);
    expect(sales.items[0].href).toBe('/my-orders');
    expect(out.at(-1)).toMatchObject({ id: 'reports', label: 'Reports' });
    // the core registry is untouched
    expect(sections.find((s) => s.id === 'sales')!.items).toHaveLength(3);
  });

  it('marks the active item', () => {
    expect(isActive('/', { href: '/' })).toBe(true);
    expect(isActive('/orders', { href: '/' })).toBe(false);
    expect(isActive('/orders/123', { href: '/orders' })).toBe(true);
    expect(isActive('/ordersx', { href: '/orders' })).toBe(false);
    expect(isActive('/shipments/1', { href: '/orders', match: ['/shipments'] })).toBe(true);
  });
});
