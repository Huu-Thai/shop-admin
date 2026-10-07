import { describe, expect, it } from 'vitest';
import {
  ancestry,
  findNode,
  flatten,
  MAX_DEPTH,
  project,
  subtreeHeight,
  type TreeNode,
} from './tree';

const n = (
  id: string,
  parentId: string | null,
  position: number,
  children: TreeNode[] = [],
): TreeNode => ({
  id,
  parentId,
  position,
  children,
});

// men ─ tees, shirts │ women ─ dresses │ sale
const tree = [
  n('women', null, 1, [n('dresses', 'women', 0)]),
  n('men', null, 0, [n('shirts', 'men', 1), n('tees', 'men', 0)]),
  n('sale', null, 2),
];
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('category tree', () => {
  it('flattens depth-first by position, hiding collapsed branches', () => {
    const flat = flatten(tree);
    expect(ids(flat)).toEqual(['men', 'tees', 'shirts', 'women', 'dresses', 'sale']);
    expect(flat.map((f) => f.depth)).toEqual([0, 1, 1, 0, 1, 0]);
    expect(flat.find((f) => f.id === 'shirts')).toMatchObject({ index: 1, parentId: 'men' });
    expect(ids(flatten(tree, new Set(['men'])))).toEqual(['men', 'women', 'dresses', 'sale']);
    expect(ids(flatten(tree, new Set(), 'women'))).toEqual([
      'men',
      'tees',
      'shirts',
      'women',
      'sale',
    ]);
  });

  it('finds nodes, ancestry and subtree height', () => {
    expect(findNode(tree, 'dresses')?.parentId).toBe('women');
    expect(ancestry(tree, 'shirts')).toEqual(['men', 'shirts']);
    expect(ancestry(tree, 'nope')).toEqual([]);
    expect(subtreeHeight(tree[1])).toBe(2);
  });

  describe('drop projection', () => {
    const items = flatten(tree);
    it('reorders among siblings without a sideways drag', () => {
      // drag "shirts" over "tees": becomes first child of men
      expect(project(items, 'shirts', 'tees', 0, 24)).toEqual({
        depth: 1,
        parentId: 'men',
        index: 0,
      });
      // drag "sale" over "men": first root
      expect(project(items, 'sale', 'men', 0, 24)).toEqual({ depth: 0, parentId: null, index: 0 });
    });

    it('nests under the previous row when dragged right', () => {
      // "sale" dropped where it is, one level right → last child of women
      expect(project(items, 'sale', 'sale', 24, 24)).toEqual({
        depth: 1,
        parentId: 'women',
        index: 1,
      });
      // two levels right → child of dresses (the row above)
      expect(project(items, 'sale', 'sale', 48, 24)).toEqual({
        depth: 2,
        parentId: 'dresses',
        index: 0,
      });
      // can't go deeper than one below the row above
      expect(project(items, 'sale', 'sale', 500, 24)?.depth).toBe(2);
    });

    it('moves out to a shallower level when dragged left', () => {
      // "dresses" one level left, staying below women → root after women
      expect(project(items, 'dresses', 'dresses', -24, 24)).toEqual({
        depth: 0,
        parentId: null,
        index: 2,
      });
    });

    it('never nests deeper than the API allows', () => {
      let deep: TreeNode[] = [];
      let parent: string | null = null;
      for (let d = 0; d < MAX_DEPTH; d++) {
        const node = n(`d${d}`, parent, 0);
        if (!deep.length) deep = [node];
        else findNode(deep, parent!)!.children.push(node);
        parent = node.id;
      }
      deep.push(n('x', null, 1));
      const flat = flatten(deep);
      expect(project(flat, 'x', 'x', 24 * 20, 24)?.depth).toBe(MAX_DEPTH - 1);
      expect(project(flat, 'x', 'x', 24 * 20, 24, 3)?.depth).toBe(MAX_DEPTH - 3);
    });
  });
});
