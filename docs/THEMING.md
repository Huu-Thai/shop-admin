# Theming

Everything visual comes from **tokens**. Change tokens, not components, and the whole app follows —
light and dark modes, every screen, the style guide.

## 1. Branding — `src/theme/config.ts`

| Key                           | Effect                                                               |
| ----------------------------- | -------------------------------------------------------------------- |
| `name`, `monogram`, `tagline` | Logo lock-up, page titles, sign-in page                              |
| `presets`                     | Accent presets offered in the user menu (must exist in `tokens.css`) |
| `defaultPreset`               | Accent for new visitors                                              |
| `defaultMode`                 | `light`, `dark` or `system`                                          |

Replace `src/app/favicon.ico` with your icon.

## 2. Colours — `src/theme/tokens.css`

- `:root` holds the **Ink** scale (from `#191919`), the accent scale, status and chart colours, and
  the **semantic tokens** components use (`--bg`, `--surface`, `--fg`, `--primary`, `--accent` …).
- `.dark` overrides semantic tokens only.
- `[data-theme='<preset>']` overrides the accent scale only.

### Add an accent preset

1. In `tokens.css`, copy the `cobalt` block, rename it and set `--accent-50 … --accent-900`.
   Keep `--accent-400` light enough for ink text (≥ 4.5:1) and `--accent-700` dark enough for text
   on white (≥ 4.5:1).
2. Add `{ id, label, swatch }` to `presets` in `src/theme/config.ts`.
3. Run `npm test` — `src/theme/tokens.test.ts` checks every text/background pair in both modes for
   every preset and fails if one drops below WCAG AA.

### Change the base colour

Replace the `--ink-*` values (keep the same steps: 950 darkest … 50 lightest), then run `npm test`
and review `/style-guide` → Contrast in both modes.

## 3. Typography

Fonts are loaded in `src/app/layout.tsx` with `next/font` (Inter, JetBrains Mono). Swap them there;
the type scale (`text-display … text-overline`) lives in `src/app/globals.css` under `@theme`.

## 4. Shape, depth, layout

`--radius-*`, `--shadow-*`, `--sidebar-width`, `--header-height`, `--content-max`, `--form-max` in
`tokens.css`. Motion durations collapse to 0 when the user prefers reduced motion.

## 5. Language

Messages live in `src/i18n/<locale>.ts` (English is the reference). To add a language: copy `vi.ts`,
translate, add it to `LOCALES` and `catalogues` in `src/i18n/index.ts`. A test fails if keys or
placeholders differ from English.

Counted messages take `{n}` and an optional `singular|plural` pair in English (`'{n} rate|{n} rates'`);
languages without plural forms (Vietnamese) give one form. The translator picks the first form when
`n` is 1.
