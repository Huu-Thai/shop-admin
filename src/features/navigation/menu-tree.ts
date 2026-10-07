/**
 * Menu item tree helpers. Items come flat with `parentId` and `position`; moves return only the
 * items whose parent or position changes, with siblings renumbered 0..n.
 */
export interface FlatItem {
  id: string;
  parentId: string | null;
  position: number;
}

export interface Row<T extends FlatItem> {
  item: T;
  depth: number;
  index: number;
  siblings: number;
}

export type Move = { id: string; parentId: string | null; position: number };
export type Direction = 'up' | 'down' | 'indent' | 'outdent';

/** Levels the shop allows (MAX_MENU_DEPTH). */
export const MAX_DEPTH = 5;

const childrenOf = <T extends FlatItem>(items: T[], parentId: string | null) =>
  items
    .filter((i) => i.parentId === parentId)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));

/** Depth-first rows for display. */
export function rows<T extends FlatItem>(
  items: T[],
  parentId: string | null = null,
  depth = 0,
): Row<T>[] {
  const kids = childrenOf(items, parentId);
  return kids.flatMap((item, index) => [
    { item, depth, index, siblings: kids.length },
    ...rows(items, item.id, depth + 1),
  ]);
}

const subtreeDepth = (items: FlatItem[], id: string): number =>
  1 + Math.max(0, ...items.filter((i) => i.parentId === id).map((c) => subtreeDepth(items, c.id)));

const depthOf = (items: FlatItem[], id: string): number => {
  const it = items.find((i) => i.id === id);
  return it?.parentId ? 1 + depthOf(items, it.parentId) : 0;
};

/** Whether a move is possible (bounds and nesting depth). */
export function canMove(items: FlatItem[], id: string, dir: Direction): boolean {
  const it = items.find((i) => i.id === id);
  if (!it) return false;
  const sibs = childrenOf(items, it.parentId);
  const idx = sibs.findIndex((s) => s.id === id);
  switch (dir) {
    case 'up':
      return idx > 0;
    case 'down':
      return idx < sibs.length - 1;
    case 'indent':
      return idx > 0 && depthOf(items, id) + subtreeDepth(items, id) < MAX_DEPTH;
    default:
      return it.parentId !== null;
  }
}

const renumber = (list: FlatItem[], parentId: string | null): Move[] =>
  list.map((x, position) => ({ id: x.id, parentId, position }));

/** The PATCHes a move needs (changed items only). */
export function move(items: FlatItem[], id: string, dir: Direction): Move[] {
  if (!canMove(items, id, dir)) return [];
  const it = items.find((i) => i.id === id)!;
  const sibs = childrenOf(items, it.parentId);
  const idx = sibs.findIndex((s) => s.id === id);
  let next: Move[];
  if (dir === 'up' || dir === 'down') {
    const order = [...sibs];
    const j = dir === 'up' ? idx - 1 : idx + 1;
    [order[idx], order[j]] = [order[j], order[idx]];
    next = renumber(order, it.parentId);
  } else if (dir === 'indent') {
    const parent = sibs[idx - 1];
    next = [
      ...renumber(
        sibs.filter((s) => s.id !== id),
        it.parentId,
      ),
      ...renumber([...childrenOf(items, parent.id), it], parent.id),
    ];
  } else {
    const parent = items.find((i) => i.id === it.parentId)!;
    const outer = childrenOf(items, parent.parentId);
    const at = outer.findIndex((o) => o.id === parent.id) + 1;
    next = [
      ...renumber(
        sibs.filter((s) => s.id !== id),
        it.parentId,
      ),
      ...renumber([...outer.slice(0, at), it, ...outer.slice(at)], parent.parentId),
    ];
  }
  return next.filter((m) => {
    const cur = items.find((i) => i.id === m.id)!;
    return cur.parentId !== m.parentId || cur.position !== m.position;
  });
}

/** Ids of an item and everything under it (can't be its own parent). */
export function descendants(items: FlatItem[], id: string): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of items)
      if (i.parentId && out.has(i.parentId) && !out.has(i.id)) {
        out.add(i.id);
        grew = true;
      }
  }
  return out;
}
