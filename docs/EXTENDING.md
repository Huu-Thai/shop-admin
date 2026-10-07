# Extending Shop Admin

Build your own screens without editing theme files, so theme updates merge cleanly.

## Folder conventions

```
src/app/(app)/<route>/page.tsx   your page (inside the shell, signed in)
src/features/<area>/             components, queries and actions of a feature
src/features/extensions.ts       your navigation entries
```

## 1. Add a page

```tsx
// src/app/(app)/returns/page.tsx
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';

export const metadata = { title: 'Returns' };

export default async function ReturnsPage() {
  await requirePermission('orders:read'); // no permission → /forbidden
  const orders = await call(
    adminApi().GET('/api/v1/admin/orders', { params: { query: { limit: 20 } } }),
  );
  return (
    <>
      <PageHeader title="Returns" breadcrumbs={[{ label: 'Sales' }, { label: 'Returns' }]} />
      <Card>{/* … */}</Card>
    </>
  );
}
```

Follow the page templates in `docs/STYLE-GUIDE.md` §8 (list, detail, form, dashboard, settings).

## 2. Add it to the navigation

```ts
// src/features/extensions.ts
import { Undo2 } from 'lucide-react';
import type { NavExtension } from './registry';

export const navExtensions: NavExtension[] = [
  {
    section: 'sales', // overview · sales · catalog · customers · content · system, or a new id
    item: {
      id: 'returns',
      label: 'Returns',
      href: '/returns',
      icon: Undo2,
      permission: 'orders:read',
      ready: true,
    },
  },
];
```

An item with the `id` of a built-in item replaces it. Items appear only for admins with the
permission, and in the ⌘K search.

## 3. Call the API

| From                              | Use                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Server Components, Server Actions | `call(adminApi().GET('/api/v1/admin/…'))` — fully typed                                        |
| Client Components                 | `gw<T>('orders', { method: 'POST', body })` from `@/lib/gateway-client` (adds the CSRF header) |

API errors arrive as `ApiError` (server) or `GatewayError` (client) with the shop's message — show
it with `toast.error()`.

After the shop API changes: `npm run api:types`.

### Mutations: Server Actions

Write mutations as Server Actions next to the feature and wrap them in `attempt()` — it turns API
errors into a result the UI can show and refreshes the given paths:

```ts
// src/features/returns/actions.ts
'use server';
import { attempt } from '@/server/action';
import { adminApi, call } from '@/server/api';

export async function approveReturn(id: string) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/returns/{id}/approve', { params: { path: { id } } })),
    ['/returns'],
  );
}
```

In the component: `await runAction(approveReturn(id), { success: 'Return approved' })` (from
`@/lib/action-client`) shows a toast with the API's message and validation details on failure.

Use the gateway (`gw()`) instead when the browser must stream data to the API — file uploads — or
needs to search as the admin types.

### Client and server modules

A file that starts with `'use client'` may export components, but a Server Component can only
_render_ them — it can't call its functions. Keep shared helpers (constants, formatting, pure
logic) in files without the directive, as `src/features/catalog/products/product-meta.tsx` does.
This includes constants a page reads on the server (status lists, tab lists): put them in a
`tabs.ts`-style module, never in the client component file, or the page fails at runtime with
"… is not a function".

## 4. Build with the UI kit

Import from `@/components/ui` (server-safe) and `@/components/ui/controls` / `overlays` (client).
Use semantic colour utilities only (`bg-surface`, `text-fg-muted`, `border-border` …) — never hex
values — so your screens follow modes and presets. Browse every component at `/style-guide`.

Building blocks for content screens:

- **Publishing** — `PublishPanel` and `PublishBadge` (`src/features/publishing`) give any
  publishable entity (status, window, publish / unpublish now or scheduled) the same controls.
- **Rich content** — `HtmlEditor` (`src/features/content/html-editor.tsx`) is a toolbar + HTML
  textarea + sandboxed preview with block embeds and media-library images. It takes `value` and
  `onChange`, so a WYSIWYG editor (TipTap, Lexical…) can replace it without touching the screens.
- **Images** — `ImageField` (one image, picked from or uploaded to the media library) and the
  `useImage(id)` hook for previews.
- **Jobs** — a job type you add in the shop (`@JobHandler()`) appears in Import / Export /
  Scheduled automatically with a JSON parameter field. For a typed form and translated wording, add
  its fields to `JOB_FIELDS` in `src/features/system/job-params.ts` and the keys
  `job.type.<type>.title` / `.desc` to the catalogues.
- **Lists** — `ContentList` (`src/features/content/content-list.tsx`) renders search, status and
  store filters, publishing state and paging for any publishable list.

## 5. Translate

Add keys to `src/i18n/en.ts` and every other locale; use `getT()` in Server Components and
`useI18n().t` in Client Components.

## 6. Test

Put `*.test.ts` next to your code; `npm run check` runs them with the rest. Add every new page to
`e2e/routes.ts` so the browser suite checks it at four widths with axe (see [Testing](TESTING.md)).
