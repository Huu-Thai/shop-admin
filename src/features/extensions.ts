import type { NavExtension } from './registry';

/**
 * Your navigation entries (docs/EXTENDING.md §Navigation). Theme updates never touch this file.
 *
 * @example
 * import { Ticket } from 'lucide-react';
 * export const navExtensions: NavExtension[] = [
 *   { section: 'sales', item: { id: 'returns', label: 'Returns', href: '/returns', icon: Ticket,
 *     permission: 'orders:read', ready: true } },
 * ];
 */
export const navExtensions: NavExtension[] = [];
