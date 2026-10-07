import { describe, expect, it } from 'vitest';
import { entityHref, parseChanges } from './audit';

describe('audit helpers', () => {
  it('reads field diffs', () => {
    expect(
      parseChanges('{"name":{"from":"Tee","to":"Classic tee"},"price":{"from":null,"to":2500}}'),
    ).toEqual({
      kind: 'diff',
      rows: [
        { field: 'name', from: 'Tee', to: 'Classic tee' },
        { field: 'price', from: '—', to: '2500' },
      ],
    });
  });

  it('falls back to pretty JSON or raw text', () => {
    expect(parseChanges('{"code":"x"}')).toEqual({ kind: 'json', text: '{\n  "code": "x"\n}' });
    expect(parseChanges('not json')).toEqual({ kind: 'json', text: 'not json' });
    expect(parseChanges('{}')).toBeNull();
    expect(parseChanges(null)).toBeNull();
  });

  it('links known entities', () => {
    expect(entityHref('order', 'o1')).toBe('/orders/o1');
    expect(entityHref('role', 'r1')).toBeNull();
    expect(entityHref('order', null)).toBeNull();
  });
});
