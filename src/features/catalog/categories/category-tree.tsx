'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, EyeOff, GripVertical, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Tooltip } from '@/components/ui/overlays';
import { useI18n } from '@/i18n/client';
import { cn } from '@/lib/cn';
import type { Schemas } from '@/server/api';
import { pickLocalized } from '../shared';
import { findNode, flatten, project, type Projection, subtreeHeight } from './tree';

type Node = Schemas['CategoryNodeDto'];

const INDENT = 20;

export function CategoryTree({
  tree,
  selectedId,
  collapsed,
  onToggle,
  onMove,
  onAddChild,
  canWrite,
  query,
}: {
  tree: Node[];
  selectedId: string | null;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onMove: (id: string, parentId: string | null, index: number) => void;
  onAddChild: (parentId: string) => void;
  canWrite: boolean;
  query: string;
}) {
  const { t, locale } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const name = (n: Node) => pickLocalized(n.translations, locale)?.name ?? '—';
  const q = query.trim().toLowerCase();

  const items = useMemo(() => {
    if (q) {
      // Searching: show matches with their ancestors, expanded, and no dragging.
      const keep = new Set<string>();
      const walk = (nodes: Node[], trail: string[]) => {
        for (const n of nodes) {
          const hit = n.translations.some(
            (tr) => tr.name.toLowerCase().includes(q) || tr.slug.includes(q),
          );
          if (hit) [...trail, n.id].forEach((id) => keep.add(id));
          walk(n.children, [...trail, n.id]);
        }
      };
      walk(tree, []);
      return flatten(tree).filter((f) => keep.has(f.id));
    }
    return flatten(tree, collapsed, activeId ?? undefined);
  }, [tree, collapsed, activeId, q]);

  const activeNode = activeId ? findNode(tree, activeId) : undefined;
  const projection: Projection | null =
    activeId && overId
      ? project(items, activeId, overId, offset, INDENT, activeNode ? subtreeHeight(activeNode) : 1)
      : null;

  const reset = () => {
    setActiveId(null);
    setOverId(null);
    setOffset(0);
  };

  const onDragEnd = ({ active }: DragEndEvent) => {
    if (projection) {
      const node = items.find((i) => i.id === active.id);
      if (node && (node.parentId !== projection.parentId || node.index !== projection.index))
        onMove(String(active.id), projection.parentId, projection.index);
    }
    reset();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }: DragStartEvent) => {
        setActiveId(String(active.id));
        setOverId(String(active.id));
      }}
      onDragMove={({ delta }: DragMoveEvent) => setOffset(delta.x)}
      onDragOver={({ over }) => setOverId(over ? String(over.id) : null)}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={{
        screenReaderInstructions: { draggable: t('cat.dragInstructions') },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul role="tree" aria-label={t('cat.title')} className="grid gap-px">
          {items.map((item) => (
            <Row
              key={item.id}
              id={item.id}
              depth={item.id === activeId && projection ? projection.depth : item.depth}
              label={name(item.node)}
              childCount={item.childCount}
              expanded={!!q || !collapsed.has(item.id)}
              selected={item.id === selectedId}
              inactive={!item.node.isActive}
              hiddenInMenu={!item.node.includeInMenu}
              draggable={canWrite && !q}
              onToggle={() => onToggle(item.id)}
              onAddChild={canWrite ? () => onAddChild(item.id) : undefined}
            />
          ))}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeNode && (
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-body font-medium text-fg shadow-lg">
            <GripVertical aria-hidden className="size-4 text-fg-subtle" />
            {name(activeNode)}
            {activeNode.children.length > 0 && (
              <span className="rounded-xs bg-surface-muted px-1.5 text-caption text-fg-muted">
                +{activeNode.children.length}
              </span>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Row({
  id,
  depth,
  label,
  childCount,
  expanded,
  selected,
  inactive,
  hiddenInMenu,
  draggable,
  onToggle,
  onAddChild,
}: {
  id: string;
  depth: number;
  label: string;
  childCount: number;
  expanded: boolean;
  selected: boolean;
  inactive: boolean;
  hiddenInMenu: boolean;
  draggable: boolean;
  onToggle: () => void;
  onAddChild?: () => void;
}) {
  const { t } = useI18n();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !draggable });
  return (
    <li
      ref={setNodeRef}
      role="treeitem"
      aria-selected={selected}
      aria-expanded={childCount ? expanded : undefined}
      aria-level={depth + 1}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('group relative', isDragging && 'opacity-40')}
    >
      <div
        className={cn(
          'flex h-9 items-center gap-1 rounded-md pr-1 transition-colors',
          selected ? 'bg-accent-soft text-fg' : 'hover:bg-surface-muted',
          isDragging && 'ring-2 ring-primary',
        )}
        style={{ paddingLeft: depth * INDENT + 4 }}
      >
        {draggable ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={t('cat.dragLabel', { name: label })}
            className="focus-ring flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-fg-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span className="w-1" />
        )}
        {childCount ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? t('cat.collapse') : t('cat.expand')}
            className="focus-ring flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-muted hover:text-fg"
          >
            <ChevronRight className={cn('size-4 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <Link
          href={`/categories?id=${id}`}
          scroll={false}
          aria-current={selected ? 'page' : undefined}
          className={cn(
            'focus-ring min-w-0 flex-1 truncate rounded-xs py-1 text-body',
            selected ? 'font-semibold' : 'font-medium',
            inactive && 'text-fg-subtle line-through decoration-fg-subtle/50',
          )}
        >
          {label}
        </Link>
        {hiddenInMenu && (
          <Tooltip content={t('cat.hiddenInMenu')}>
            <EyeOff
              aria-label={t('cat.hiddenInMenu')}
              className="size-3.5 shrink-0 text-fg-subtle"
            />
          </Tooltip>
        )}
        {childCount > 0 && (
          <span className="tabular shrink-0 rounded-xs px-1.5 text-caption text-fg-subtle">
            {childCount}
          </span>
        )}
        {onAddChild && (
          <Tooltip content={t('cat.addChild')}>
            <button
              type="button"
              onClick={onAddChild}
              aria-label={`${t('cat.addChild')} · ${label}`}
              className="focus-ring flex size-7 shrink-0 items-center justify-center rounded-sm text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-fg focus-visible:opacity-100"
            >
              <Plus className="size-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </li>
  );
}
