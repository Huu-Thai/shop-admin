import {
  BadgePercent,
  Boxes,
  CreditCard,
  FileText,
  FolderTree,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Images,
  Receipt,
  ScrollText,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Truck,
  UserCog,
  Users,
  Webhook,
  Workflow,
} from 'lucide-react';
import type { MessageKey } from '@/i18n';
import { hasPermission } from '@/lib/permissions';
import { navExtensions } from './extensions';

/**
 * Navigation registry (docs/EXTENDING.md). Built-in features are listed here; your own screens go
 * in src/features/extensions.ts, so theme updates never conflict with your changes. An item is shown when
 * the admin holds `permission`; `ready: false` items are listed as "Soon" until their phase ships.
 */
export interface NavItem {
  id: string;
  label: MessageKey | (string & {});
  href: string;
  icon: LucideIcon;
  permission?: string;
  ready?: boolean;
  /** Extra path prefixes that mark this item active. */
  match?: string[];
}

export interface NavExtension {
  /** An existing section id (overview, sales, catalog, customers, content, system) or a new one. */
  section: string;
  /** Label of a new section. */
  sectionLabel?: string;
  /** Replaces the built-in item with the same id. */
  item: NavItem;
}

export interface NavSection {
  id: string;
  label: MessageKey | (string & {});
  items: NavItem[];
}

const core: NavSection[] = [
  {
    id: 'overview',
    label: 'nav.overview',
    items: [
      {
        id: 'dashboard',
        label: 'nav.dashboard',
        href: '/',
        icon: LayoutDashboard,
        ready: true,
      },
    ],
  },
  {
    id: 'sales',
    label: 'nav.sales',
    items: [
      {
        id: 'orders',
        label: 'nav.orders',
        href: '/orders',
        icon: ShoppingBag,
        permission: 'orders:read',
        ready: true,
      },
      {
        id: 'payments',
        label: 'nav.payments',
        href: '/payments',
        icon: CreditCard,
        permission: 'orders:read',
        ready: true,
      },
      {
        id: 'shipping',
        label: 'nav.shipping',
        href: '/shipping',
        icon: Truck,
        permission: 'orders:read',
        ready: true,
      },
    ],
  },
  {
    id: 'catalog',
    label: 'nav.catalog',
    items: [
      {
        id: 'products',
        label: 'nav.products',
        href: '/products',
        icon: Package,
        permission: 'catalog:read',
        ready: true,
      },
      {
        id: 'categories',
        label: 'nav.categories',
        href: '/categories',
        icon: FolderTree,
        permission: 'catalog:read',
        ready: true,
      },
      {
        id: 'attributes',
        label: 'nav.attributes',
        href: '/attributes',
        icon: SlidersHorizontal,
        permission: 'catalog:read',
        ready: true,
      },
      {
        id: 'media',
        label: 'nav.media',
        href: '/media',
        icon: ImageIcon,
        permission: 'catalog:read',
        ready: true,
      },
      {
        id: 'pricing',
        label: 'nav.pricing',
        href: '/pricing',
        icon: Receipt,
        permission: 'pricing:read',
        ready: true,
        match: ['/tax'],
      },
      {
        id: 'inventory',
        label: 'nav.inventory',
        href: '/inventory',
        icon: Boxes,
        permission: 'inventory:read',
        ready: true,
      },
    ],
  },
  {
    id: 'customers',
    label: 'nav.customers',
    items: [
      {
        id: 'customers',
        label: 'nav.customers',
        href: '/customers',
        icon: Users,
        permission: 'customers:read',
        ready: true,
      },
      {
        id: 'promotions',
        label: 'nav.promotions',
        href: '/promotions',
        icon: BadgePercent,
        permission: 'marketing:read',
        ready: true,
      },
      {
        id: 'loyalty',
        label: 'nav.loyalty',
        href: '/loyalty',
        icon: Gift,
        permission: 'customers:read',
        ready: true,
      },
    ],
  },
  {
    id: 'content',
    label: 'nav.content',
    items: [
      {
        id: 'pages',
        label: 'nav.pages',
        href: '/content',
        icon: FileText,
        permission: 'cms:read',
        ready: true,
      },
      {
        id: 'merchandising',
        label: 'nav.merchandising',
        href: '/merchandising',
        icon: Images,
        permission: 'cms:read',
        ready: true,
      },
    ],
  },
  {
    id: 'system',
    label: 'nav.system',
    items: [
      {
        id: 'stores',
        label: 'nav.stores',
        href: '/stores',
        icon: Store,
        permission: 'stores:read',
        ready: true,
      },
      {
        id: 'users',
        label: 'nav.users',
        href: '/users',
        icon: UserCog,
        permission: 'admin-users:read',
        ready: true,
      },
      {
        id: 'audit',
        label: 'nav.audit',
        href: '/audit',
        icon: ScrollText,
        permission: 'audit-logs:read',
        ready: true,
      },
      {
        id: 'jobs',
        label: 'nav.jobs',
        href: '/jobs',
        icon: Workflow,
        permission: 'jobs:read',
        ready: true,
      },
      {
        id: 'webhooks',
        label: 'nav.webhooks',
        href: '/webhooks',
        icon: Webhook,
        permission: 'webhooks:read',
        ready: true,
      },
      {
        id: 'settings',
        label: 'nav.settings',
        href: '/settings',
        icon: Settings,
        // Every admin has an account section; configuration links follow their own permissions.
        ready: true,
      },
    ],
  },
];

/** Core sections plus the buyer's extensions (src/features/extensions.ts). */
export const sections: NavSection[] = applyExtensions(core, navExtensions);

export function applyExtensions(base: NavSection[], extensions: NavExtension[]): NavSection[] {
  const out = base.map((s) => ({ ...s, items: [...s.items] }));
  for (const ext of extensions) {
    let section = out.find((s) => s.id === ext.section);
    if (!section) {
      section = {
        id: ext.section,
        label: ext.sectionLabel ?? ext.section,
        items: [],
      };
      out.push(section);
    }
    const at = section.items.findIndex((i) => i.id === ext.item.id);
    if (at >= 0) section.items[at] = ext.item;
    else section.items.push(ext.item);
  }
  return out;
}

/** Serializable navigation for the signed-in admin (icons are resolved on the client by id). */
export interface VisibleNavItem extends Omit<NavItem, 'icon'> {
  ready: boolean;
}
export interface VisibleNavSection {
  id: string;
  label: string;
  items: VisibleNavItem[];
}

export function navFor(permissions: readonly string[]): VisibleNavSection[] {
  return sections
    .map((s) => ({
      id: s.id,
      label: s.label,
      items: s.items
        .filter((i) => !i.permission || hasPermission(permissions, i.permission))
        .map((i) => ({
          id: i.id,
          label: i.label,
          href: i.href,
          permission: i.permission,
          match: i.match,
          ready: i.ready ?? false,
        })),
    }))
    .filter((s) => s.items.length > 0);
}

export function navIcon(id: string): LucideIcon {
  for (const s of sections) for (const i of s.items) if (i.id === id) return i.icon;
  return LayoutDashboard;
}

/** Is `href` the current page (exact for `/`, prefix otherwise)? */
export function isActive(pathname: string, item: Pick<NavItem, 'href' | 'match'>): boolean {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`),
  );
}
