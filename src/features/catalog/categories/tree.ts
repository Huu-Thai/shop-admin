/**
 * Category tree helpers: flattening for display and drag and drop, and the drop projection
 * (where a dragged row lands: new parent and index among its siblings). Pure, unit-tested.
 */

export interface TreeNode {
  id: string;
  parentId: string | null;
  position: number;
  children: TreeNode[];
}

export interface FlatNode<T extends TreeNode = TreeNode> {
  id: string;
  parentId: string | null;
  depth: number;
  /** Index among its siblings. */
  index: number;
  childCount: number;
  node: T;
}

/** The shop API nests categories at most this deep (MAX_CATEGORY_DEPTH). */
export const MAX_DEPTH = 10;

const sorted = <T extends TreeNode>(nodes: readonly T[]) =>
  [...nodes].sort((a, b) => a.position - b.position);

/** Depth-first list of visible rows; children of collapsed ids (and of `skip`) are hidden. */
export function flatten<T extends TreeNode>(
  nodes: readonly T[],
  collapsed: ReadonlySet<string> = new Set(),
  skip?: string,
  depth = 0,
): FlatNode<T>[] {
  return sorted(nodes).flatMap((node, index) => [
    {
      id: node.id,
      parentId: node.parentId,
      depth,
      index,
      childCount: node.children.length,
      node,
    },
    ...(collapsed.has(node.id) || node.id === skip
      ? []
      : flatten(node.children as T[], collapsed, skip, depth + 1)),
  ]);
}

/** Height of a subtree in levels (a leaf is 1). */
export function subtreeHeight(node: TreeNode): number {
  return 1 + Math.max(0, ...node.children.map(subtreeHeight));
}

export function findNode<T extends TreeNode>(nodes: readonly T[], id: string): T | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children as T[], id);
    if (hit) return hit;
  }
  return undefined;
}

/** Ids from the root to `id` (inclusive), e.g. for breadcrumbs or expanding a branch. */
export function ancestry(nodes: readonly TreeNode[], id: string): string[] {
  for (const n of nodes) {
    if (n.id === id) return [id];
    const sub = ancestry(n.children, id);
    if (sub.length) return [n.id, ...sub];
  }
  return [];
}

export interface Projection {
  depth: number;
  parentId: string | null;
  /** Index among the new siblings (what the move API expects). */
  index: number;
}

/**
 * Where the active row lands when dropped over `overId`, dragged `offsetX` pixels sideways
 * (`indent` pixels per level). `items` is the flat list with the active row's subtree hidden.
 */
export function project(
  items: readonly FlatNode[],
  activeId: string,
  overId: string,
  offsetX: number,
  indent: number,
  activeHeight = 1,
): Projection | null {
  const from = items.findIndex((i) => i.id === activeId);
  const to = items.findIndex((i) => i.id === overId);
  if (from < 0 || to < 0) return null;
  const active = items[from];
  const moved = [...items];
  moved.splice(to, 0, ...moved.splice(from, 1));
  const prev = moved[to - 1];
  const next = moved[to + 1];

  const wanted = active.depth + Math.round(offsetX / indent);
  const maxDepth = Math.min(prev ? prev.depth + 1 : 0, MAX_DEPTH - activeHeight);
  const minDepth = next ? next.depth : 0;
  const depth = Math.max(minDepth, Math.min(wanted, Math.max(maxDepth, minDepth)));

  let parentId: string | null = null;
  if (depth > 0 && prev) {
    if (depth === prev.depth) parentId = prev.parentId;
    else if (depth > prev.depth) parentId = prev.id;
    else
      parentId =
        moved
          .slice(0, to)
          .reverse()
          .find((i) => i.depth === depth)?.parentId ?? null;
  }
  const index = moved
    .slice(0, to)
    .filter((i) => i.parentId === parentId && i.depth === depth && i.id !== activeId).length;
  return { depth, parentId, index };
}
