import type { MessageKey } from '@/i18n';

export const CONTENT_TABS: { href: string; label: MessageKey }[] = [
  { href: '/content', label: 'cms.pages' },
  { href: '/content/posts', label: 'cms.posts' },
  { href: '/content/blocks', label: 'cms.blocks' },
  { href: '/content/menus', label: 'menu.title' },
  { href: '/content/redirects', label: 'rw.title' },
  { href: '/content/schedule', label: 'sched.title' },
];

export const MERCH_TABS: { href: string; label: MessageKey }[] = [
  { href: '/merchandising', label: 'ban.title' },
  { href: '/merchandising/sliders', label: 'sld.title' },
];

/** Shop API patterns (cms and merchandising modules). */
export const PAGE_SLUG = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;
export const POST_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const IDENTIFIER = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
export const REGION = /^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/;
export const LAYOUT = /^[a-z0-9][a-z0-9_-]{0,63}$/;
/** Site paths (`/sale`) or http(s) URLs; never `//host`. */
export const LINK = /^(?:\/(?!\/)[^\s]*|https?:\/\/[^\s]+)$/;

export const SCHEDULE_STATUSES = ['PENDING', 'DONE', 'FAILED', 'CANCELLED'] as const;
export const CONTENT_TYPES = [
  'PAGE',
  'POST',
  'BLOCK',
  'BANNER',
  'SLIDER',
  'CAMPAIGN',
  'PROMOTION',
] as const;
export const TARGET_TYPES = ['PRODUCT', 'CATEGORY', 'CMS_PAGE', 'CMS_POST', 'CUSTOM'] as const;
/** Common banner slots (themes may define others). */
export const PLACEMENTS = [
  'home.hero',
  'home.top',
  'home.middle',
  'category.top',
  'product.bottom',
  'cart.top',
];
