import { describe, expect, it } from 'vitest';
import { canMove, descendants, type Direction, move as rawMove, rows } from './menu-tree';

const move = (list: Parameters<typeof rawMove>[0], id: string, dir: Direction) =>
  rawMove(list, id, dir).sort((a, b) => a.id.localeCompare(b.id));

const items = [
  { id: 'men', parentId: null, position: 0 },
  { id: 'women', parentId: null, position: 1 },
  { id: 'sale', parentId: null, position: 2 },
  { id: 'tees', parentId: 'men', position: 0 },
  { id: 'shoes', parentId: 'men', position: 1 },
];

describe('menu tree', () => {
  it('lists rows depth-first', () => {
    expect(rows(items).map((r) => `${r.depth}:${r.item.id}`)).toEqual([
      '0:men',
      '1:tees',
      '1:shoes',
      '0:women',
      '0:sale',
    ]);
  });

  it('swaps siblings', () => {
    expect(move(items, 'sale', 'up')).toEqual([
      { id: 'sale', parentId: null, position: 1 },
      { id: 'women', parentId: null, position: 2 },
    ]);
    expect(canMove(items, 'men', 'up')).toBe(false);
  });

  it('indents under the previous sibling and outdents after the parent', () => {
    expect(move(items, 'women', 'indent')).toEqual([
      { id: 'sale', parentId: null, position: 1 },
      { id: 'women', parentId: 'men', position: 2 },
    ]);
    expect(move(items, 'tees', 'outdent')).toEqual([
      { id: 'sale', parentId: null, position: 3 },
      { id: 'shoes', parentId: 'men', position: 0 },
      { id: 'tees', parentId: null, position: 1 },
      { id: 'women', parentId: null, position: 2 },
    ]);
  });

  it('respects the depth limit and finds descendants', () => {
    const chain = [
      { id: 'r0', parentId: null, position: 0 },
      { id: 'c1', parentId: null, position: 1 },
      { id: 'c2', parentId: 'c1', position: 0 },
      { id: 'c3', parentId: 'c2', position: 0 },
      { id: 'c4', parentId: 'c3', position: 0 },
    ];
    expect(canMove(chain, 'c1', 'indent')).toBe(true); // 5 levels
    expect(canMove([...chain, { id: 'c5', parentId: 'c4', position: 0 }], 'c1', 'indent')).toBe(
      false,
    );
    expect([...descendants(chain, 'c2')].sort()).toEqual(['c2', 'c3', 'c4']);
  });
});
