'use client';

import {
  Bell,
  Download,
  Inbox,
  MoreHorizontal,
  Moon,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Logo } from '@/components/shell/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Dropzone } from '@/components/ui/dropzone';
import { Pagination } from '@/components/ui/pagination';
import { RadioCard, RadioGroup } from '@/components/ui/radio';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SortableList } from '@/components/ui/sortable';
import {
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/controls';
import { Avatar, EmptyState, Kbd, Skeleton } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Tooltip,
} from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { Stat } from '@/components/ui/stat';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { StatusBadge } from '@/features/orders/status';
import { cn } from '@/lib/cn';
import { applyPreset } from '@/lib/preferences';
import { useCssVars, usePreset } from '@/lib/use-document';
import { contrast, over, parseColor } from '@/theme/contrast';
import { themeConfig } from '@/theme/config';
import {
  accentScale,
  chartTokens,
  contrastPairs,
  inkScale,
  radii,
  semanticTokens,
  shadows,
  spacing,
  statusTokens,
  typeScale,
} from '@/theme/tokens';

const SECTIONS = [
  ['colour', 'Colour'],
  ['contrast', 'Contrast'],
  ['typography', 'Typography'],
  ['spacing', 'Spacing & shape'],
  ['layout', 'Layout'],
  ['buttons', 'Buttons'],
  ['forms', 'Forms'],
  ['data', 'Data display'],
  ['feedback', 'Feedback'],
  ['overlays', 'Overlays'],
  ['patterns', 'Patterns'],
] as const;

const ALL_TOKENS = [
  ...new Set([
    ...inkScale.map((s) => `ink-${s}`),
    ...accentScale.map((s) => `accent-${s}`),
    ...semanticTokens.map((s) => s.token),
    ...statusTokens.flatMap((s) => [s, `${s}-soft`, `${s}-fg`]),
    ...chartTokens,
    ...contrastPairs.flatMap((p) => [p.fg, p.bg]),
  ]),
];

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-border pt-10 first:border-0 first:pt-0"
    >
      <h2 id={`${id}-title`} className="text-h2 text-fg">
        {title}
      </h2>
      {lead && <p className="mt-1.5 max-w-[72ch] text-body text-fg-muted">{lead}</p>}
      <div className="mt-6 grid gap-6">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-3">
      <h3 className="text-overline font-semibold tracking-[0.08em] text-fg-muted uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Swatch({ token, label, value }: { token: string; label?: string; value?: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="h-16" style={{ background: `var(--${token})` }} />
      <div className="px-3 py-2">
        <p className="truncate text-small font-medium text-fg">{label ?? token}</p>
        <p className="font-mono text-caption text-fg-muted uppercase">{value || '—'}</p>
      </div>
    </div>
  );
}

function ModeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const preset = usePreset();
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex rounded-md border border-border bg-surface p-0.5"
        role="group"
        aria-label="Accent preset"
      >
        {themeConfig.presets.map((p) => (
          <Tooltip key={p.id} content={p.label} side="bottom">
            <button
              type="button"
              aria-pressed={preset === p.id}
              aria-label={p.label}
              onClick={() => applyPreset(p.id)}
              className={cn(
                'focus-ring flex size-7 items-center justify-center rounded-sm sm:size-8',
                preset === p.id && 'bg-surface-muted',
              )}
            >
              <span
                className="size-4 rounded-full border border-border-strong"
                style={{ background: p.swatch }}
              />
            </button>
          </Tooltip>
        ))}
      </div>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Toggle colour mode"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
      </Button>
    </div>
  );
}

function PatternsDemo() {
  const [picked, setPicked] = useState<string[]>(['red']);
  const [kind, setKind] = useState('SIMPLE');
  const [rows, setRows] = useState(['Colour', 'Size', 'Material']);
  const [sheet, setSheet] = useState(false);
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="sg-combo">Combobox (multiple, searchable)</Label>
          <Combobox
            id="sg-combo"
            multiple
            value={picked}
            onChange={setPicked}
            options={[
              { value: 'red', label: 'Red', hint: 'color · #DC2626' },
              { value: 'navy', label: 'Navy', hint: 'color · #1E3A8A' },
              { value: 'sand', label: 'Sand', hint: 'color · #E9D8B4' },
            ]}
          />
        </div>
        <div className="grid content-start gap-2">
          <Label>Sortable list (drag the handle, or Space + arrows)</Label>
          <SortableList
            items={rows}
            getId={(r) => r}
            onReorder={setRows}
            renderItem={(r, _i, handle) => (
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-2 text-body">
                {handle}
                {r}
              </div>
            )}
          />
        </div>
      </div>
      <RadioGroup
        value={kind}
        onValueChange={setKind}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        aria-label="Choice cards"
      >
        <RadioCard
          value="SIMPLE"
          icon={<Inbox />}
          title="Choice card"
          description="One option of a few, with a short explanation."
        />
        <RadioCard
          value="CONFIGURABLE"
          icon={<TrendingUp />}
          title="Selected state"
          description="Accent fill and a ring."
        />
        <RadioCard
          value="BUNDLE"
          icon={<Pencil />}
          title="Keyboard"
          description="Arrow keys move between cards."
        />
      </RadioGroup>
      <Dropzone
        onFiles={(f) => toast(`${f.length} file(s) dropped`)}
        title="Drop images here or click to browse"
        hint="JPEG, PNG, WebP · up to 20 MB"
      />
      <div className="flex flex-wrap gap-3">
        <Sheet open={sheet} onOpenChange={setSheet}>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Open side panel
          </Button>
          <SheetContent
            title="Edit attribute"
            description="Side panels keep the list in view."
            footer={<Button onClick={() => setSheet(false)}>Done</Button>}
          >
            <p className="text-body text-fg-muted">
              Forms that belong to a list open here: attributes, sets, variants, media.
            </p>
          </SheetContent>
        </Sheet>
      </div>
      <Card className="overflow-hidden">
        <Pagination page={2} limit={25} total={312} />
      </Card>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-surface-inverse px-4 py-3 text-fg-inverse shadow-lg">
        <p className="text-small font-medium">You have unsaved changes</p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-fg-inverse-muted hover:bg-surface-inverse-hover hover:text-white"
          >
            Discard
          </Button>
          <Button variant="accent" size="sm">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StyleGuide() {
  const tokens = useCssVars(ALL_TOKENS);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[var(--content-max)] items-center justify-between gap-2 px-4 sm:gap-4 md:px-8">
          <Link href="/" aria-label={themeConfig.name} className="focus-ring rounded-md text-fg">
            <Logo compact className="sm:hidden" />
            <Logo className="hidden sm:inline-flex" />
          </Link>
          <ModeSwitch />
        </div>
      </header>

      <div className="mx-auto grid max-w-[var(--content-max)] grid-cols-1 gap-10 px-4 py-8 md:px-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Style guide" className="hidden lg:block">
          <ul className="sticky top-24 grid gap-0.5">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="focus-ring block rounded-md px-3 py-1.5 text-body text-fg-muted hover:bg-surface-muted hover:text-fg"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="grid min-w-0 gap-12">
          <PageHeader
            breadcrumbs={[{ label: themeConfig.name, href: '/' }, { label: 'Style guide' }]}
            title="Style guide"
            description="The Ink design system: tokens, type, layout and components. Built from the base colour #191919 with a lime accent; every layout in the app is composed from what is on this page. The written spec lives in docs/STYLE-GUIDE.md."
            actions={<Badge tone="outline">v{process.env.NEXT_PUBLIC_APP_VERSION}</Badge>}
          />

          <Section
            id="colour"
            title="Colour"
            lead="Components only use semantic tokens. Modes and presets override tokens — never component styles. Switch mode or accent at the top right to see every swatch update."
          >
            <Sub title="Ink — neutral scale">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                {inkScale.map((s) => (
                  <Swatch key={s} token={`ink-${s}`} value={tokens[`ink-${s}`]} />
                ))}
              </div>
            </Sub>
            <Sub title="Accent (active preset)">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {accentScale.map((s) => (
                  <Swatch key={s} token={`accent-${s}`} value={tokens[`accent-${s}`]} />
                ))}
              </div>
            </Sub>
            <Sub title="Semantic">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {semanticTokens.map((s) => (
                  <Swatch
                    key={s.token}
                    token={s.token}
                    label={`--${s.token}`}
                    value={tokens[s.token]}
                  />
                ))}
              </div>
            </Sub>
            <Sub title="Status">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statusTokens.map((s) => (
                  <div
                    key={s}
                    className="overflow-hidden rounded-md border border-border bg-surface"
                  >
                    <div className="flex h-16">
                      <div className="flex-1" style={{ background: `var(--${s})` }} />
                      <div
                        className="flex flex-1 items-center justify-center text-small font-medium"
                        style={{
                          background: `var(--${s}-soft)`,
                          color: `var(--${s}-fg)`,
                        }}
                      >
                        Aa
                      </div>
                    </div>
                    <p className="px-3 py-2 text-small font-medium text-fg capitalize">{s}</p>
                  </div>
                ))}
              </div>
            </Sub>
            <Sub title="Charts (in order)">
              <div className="flex h-12 overflow-hidden rounded-md border border-border">
                {chartTokens.map((c) => (
                  <div key={c} className="flex-1" style={{ background: `var(--${c})` }} title={c} />
                ))}
              </div>
            </Sub>
          </Section>

          <Section
            id="contrast"
            title="Contrast"
            lead="Measured live from the current mode and preset against WCAG 2.2 AA: 4.5:1 for text, 3:1 for control boundaries. The same pairs are verified in the unit tests."
          >
            <Card className="overflow-hidden">
              <Table>
                <THead>
                  <tr>
                    <TH>Sample</TH>
                    <TH>Pair</TH>
                    <TH>Use</TH>
                    <TH data-align="right">Ratio</TH>
                    <TH data-align="right">AA</TH>
                  </tr>
                </THead>
                <TBody>
                  {contrastPairs.map((p) => {
                    const bg = parseColor(tokens[p.bg] ?? '');
                    const surface = parseColor(tokens.surface ?? '') ?? [255, 255, 255, 1];
                    const fg = parseColor(tokens[p.fg] ?? '');
                    const ratio =
                      bg && fg ? contrast(over(fg, over(bg, surface)), over(bg, surface)) : null;
                    const ok = ratio !== null && ratio >= p.min;
                    return (
                      <TR key={`${p.fg}-${p.bg}`}>
                        <TD>
                          <span
                            aria-hidden
                            className="inline-flex h-8 w-14 items-center justify-center rounded-sm border border-border text-small font-semibold"
                            style={{
                              background: `var(--${p.bg})`,
                              color: `var(--${p.fg})`,
                            }}
                          >
                            {/* Below 4.5:1 the pair is for borders and icons (non-text), shown as a bar. */}
                            {p.min >= 4.5 ? (
                              'Aa'
                            ) : (
                              <span
                                className="h-1 w-8 rounded-full"
                                style={{ background: `var(--${p.fg})` }}
                              />
                            )}
                          </span>
                        </TD>
                        <TD className="font-mono text-caption">
                          --{p.fg} / --{p.bg}
                        </TD>
                        <TD className="text-fg-muted">{p.use}</TD>
                        <TD data-align="right">{ratio ? `${ratio.toFixed(2)}:1` : '—'}</TD>
                        <TD data-align="right">
                          {ratio !== null && (
                            <Badge tone={ok ? 'success' : 'danger'}>{ok ? 'Pass' : 'Fail'}</Badge>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Card>
          </Section>

          <Section
            id="typography"
            title="Typography"
            lead="Inter for UI, JetBrains Mono for codes, SKUs and IDs. Numbers in tables and stats use tabular figures. One h1 per page."
          >
            <Card>
              <ul className="divide-y divide-border">
                {typeScale.map((t) => (
                  <li
                    key={t.name}
                    className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[160px_minmax(0,1fr)_200px] md:items-baseline md:px-6"
                  >
                    <span className="font-mono text-caption text-fg-muted">text-{t.name}</span>
                    <span
                      className={cn(
                        'truncate text-fg',
                        `text-${t.name}`,
                        t.name === 'overline' && 'tracking-[0.08em] uppercase',
                      )}
                      style={{ fontWeight: t.weight }}
                    >
                      Commerce, calmly organised
                    </span>
                    <span className="text-caption text-fg-muted md:text-right">
                      {t.size}/{t.line} · {t.weight} · {t.use}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <p className="text-body text-fg-muted">
              Mono:{' '}
              <code className="rounded-xs bg-surface-muted px-1.5 py-0.5 font-mono text-small text-fg">
                SKU-TEE-BLK-M
              </code>{' '}
              · Tabular: <span className="tabular text-fg">1,284.00 · 98,431.50</span>
            </p>
          </Section>

          <Section
            id="spacing"
            title="Spacing & shape"
            lead="A 4 px grid. Radii grow with the size of the element; shadows are subtle and reserved for elevation (cards xs, popovers lg)."
          >
            <Sub title="Spacing">
              <div className="grid gap-2">
                {spacing.map((s) => (
                  <div key={s} className="flex items-center gap-4">
                    <span className="w-12 font-mono text-caption text-fg-muted">{s}px</span>
                    <span className="h-3 rounded-xs bg-accent" style={{ width: s * 3 }} />
                  </div>
                ))}
              </div>
            </Sub>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Sub title="Radius">
                <div className="flex flex-wrap gap-4">
                  {radii.map((r) => (
                    <div key={r} className="grid justify-items-center gap-2">
                      <div
                        className="size-16 border-2 border-fg bg-surface-muted"
                        style={{ borderRadius: `var(--radius-${r})` }}
                      />
                      <span className="font-mono text-caption text-fg-muted">{r}</span>
                    </div>
                  ))}
                </div>
              </Sub>
              <Sub title="Elevation">
                <div className="flex flex-wrap gap-4">
                  {shadows.map((s) => (
                    <div
                      key={s}
                      className="grid size-20 place-items-center rounded-lg bg-surface font-mono text-caption text-fg-muted"
                      style={{ boxShadow: `var(--shadow-${s})` }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </Sub>
            </div>
          </Section>

          <Section
            id="layout"
            title="Layout"
            lead="Every screen is composed of the same frame. Content is centred up to 1440 px; forms are capped at 880 px for readable line lengths."
          >
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="grid h-64 grid-cols-[88px_1fr] text-caption sm:grid-cols-[132px_1fr]">
                <div className="flex flex-col gap-1.5 bg-surface-inverse p-3 text-fg-inverse-muted">
                  <span className="font-semibold text-white">Sidebar</span>
                  <span>264 / 76 px</span>
                  <span className="mt-2 h-2 rounded-xs bg-white/15" />
                  <span className="h-2 rounded-xs bg-accent" />
                  <span className="h-2 rounded-xs bg-white/15" />
                </div>
                <div className="grid grid-rows-[40px_1fr]">
                  <div className="flex items-center justify-between border-b border-border px-4 text-fg-muted">
                    <span>Header · 64 px · search, theme, user</span>
                    <span>sticky</span>
                  </div>
                  <div className="grid gap-2 bg-bg p-4">
                    <div className="h-6 w-1/3 rounded-xs bg-surface-muted" />
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-10 rounded-sm border border-border bg-surface" />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 h-16 rounded-sm border border-border bg-surface" />
                      <div className="h-16 rounded-sm border border-border bg-surface" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Table>
              <THead>
                <tr>
                  <TH>Breakpoint</TH>
                  <TH>Width</TH>
                  <TH>Gutter</TH>
                  <TH>Behaviour</TH>
                </tr>
              </THead>
              <TBody>
                {[
                  ['base', '< 640', '16 px', 'Off-canvas navigation, single column'],
                  [
                    'sm / md',
                    '640 – 1023',
                    '24 px',
                    'Two-column stats, tables scroll horizontally',
                  ],
                  ['lg', '1024 – 1279', '32 px', 'Fixed sidebar (collapsible to 76 px)'],
                  ['xl+', '≥ 1280', '32 px', 'Four stats per row, 2/3 + 1/3 content grids'],
                ].map((r) => (
                  <TR key={r[0]}>
                    {r.map((c, i) => (
                      <TD key={i} className={i === 0 ? 'font-mono' : undefined}>
                        {c}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </Section>

          <Section
            id="buttons"
            title="Buttons"
            lead="One primary action per area. Secondary for alternatives, ghost for toolbars, danger only for destructive confirmations, accent on inverse surfaces."
          >
            <Sub title="Variants">
              <div className="flex flex-wrap items-center gap-3">
                <Button>
                  <Plus />
                  Add product
                </Button>
                <Button variant="secondary">
                  <Download />
                  Export
                </Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="danger">
                  <Trash2 />
                  Delete
                </Button>
                <Button variant="link">Learn more</Button>
                <span className="rounded-md bg-surface-inverse p-2">
                  <Button variant="accent">Upgrade</Button>
                </span>
              </div>
            </Sub>
            <Sub title="Sizes and states">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small · 32</Button>
                <Button>Medium · 40</Button>
                <Button size="lg">Large · 48</Button>
                <Button loading>Saving</Button>
                <Button disabled>Disabled</Button>
                <Tooltip content="Edit">
                  <Button variant="secondary" size="icon" aria-label="Edit">
                    <Pencil />
                  </Button>
                </Tooltip>
                <Button variant="ghost" size="icon-sm" aria-label="More">
                  <MoreHorizontal />
                </Button>
              </div>
            </Sub>
          </Section>

          <Section
            id="forms"
            title="Forms"
            lead="Labels above controls, helper text below, errors replace helper text and are announced. Controls are 40 px; inputs use the strong border for 3:1 contrast."
          >
            <Card className="max-w-[var(--form-max)]">
              <CardHeader title="Product details" description="Shown on every storefront." />
              <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field id="sg-name" label="Name" required hint="Up to 255 characters.">
                  <Input id="sg-name" defaultValue="Classic tee" aria-describedby="sg-name-hint" />
                </Field>
                <Field id="sg-sku" label="SKU" error="This SKU is already used by another product.">
                  <Input
                    id="sg-sku"
                    defaultValue="TEE-BLK"
                    aria-invalid
                    aria-describedby="sg-sku-error"
                    className="font-mono"
                  />
                </Field>
                <Field id="sg-search" label="With icon">
                  <div className="relative">
                    <Search
                      aria-hidden
                      className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
                    />
                    <Input id="sg-search" placeholder="Search products…" className="pl-9" />
                  </div>
                </Field>
                <div className="grid gap-1.5">
                  <Label htmlFor="sg-type">Type</Label>
                  <Select defaultValue="simple">
                    <SelectTrigger id="sg-type" />
                    <SelectContent>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="configurable">Configurable</SelectItem>
                      <SelectItem value="bundle">Bundle</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field id="sg-desc" label="Description" className="md:col-span-2">
                  <Textarea id="sg-desc" placeholder="What makes it special?" />
                </Field>
                <div className="flex items-center gap-2.5">
                  <Checkbox id="sg-featured" defaultChecked />
                  <Label htmlFor="sg-featured">Featured on the home page</Label>
                </div>
                <div className="flex items-center justify-between gap-3 md:justify-start">
                  <Label htmlFor="sg-active">Visible in store</Label>
                  <Switch id="sg-active" defaultChecked />
                </div>
              </CardBody>
              <CardFooter>
                <Button variant="ghost">Cancel</Button>
                <Button
                  onClick={() =>
                    toast.success('Product saved', {
                      description: 'Classic tee is live on 2 stores.',
                    })
                  }
                >
                  Save
                </Button>
              </CardFooter>
            </Card>
          </Section>

          <Section
            id="data"
            title="Data display"
            lead="Stats lead with the figure and compare with the previous period. Tables: 52 px rows, caps headers, numbers right-aligned in tabular figures, status as badges."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Revenue"
                value="$48,290"
                change={0.124}
                hint="vs previous 30 days"
                icon={<TrendingUp />}
              />
              <Stat label="Refund rate" value="1.8%" change={-0.032} hint="vs previous 30 days" />
            </div>
            <Sub title="Badges">
              <div className="flex flex-wrap gap-2">
                <Badge>Neutral</Badge>
                <Badge tone="success" dot>
                  Paid
                </Badge>
                <Badge tone="warning" dot>
                  Pending
                </Badge>
                <Badge tone="danger" dot>
                  Failed
                </Badge>
                <Badge tone="info" dot>
                  Processing
                </Badge>
                <Badge tone="accent">New</Badge>
                <Badge tone="outline">Draft</Badge>
              </div>
            </Sub>
            <Card className="overflow-hidden">
              <Tabs defaultValue="all">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="open">Open</TabsTrigger>
                    <TabsTrigger value="done">Done</TabsTrigger>
                  </TabsList>
                  <Button variant="secondary" size="sm">
                    <Download />
                    Export
                  </Button>
                </div>
                {(['all', 'open', 'done'] as const).map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-4">
                    <Table>
                      <THead>
                        <tr>
                          <TH className="w-10">
                            <Checkbox aria-label="Select all" />
                          </TH>
                          <TH>Order</TH>
                          <TH>Customer</TH>
                          <TH>Status</TH>
                          <TH data-align="right">Total</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {[
                          ['SO-10482', 'Mai Nguyen', 'Avatar', 'COMPLETE', '$129.00'],
                          ['SO-10481', 'Alex Kim', 'Avatar', 'PROCESSING', '$58.40'],
                          ['SO-10480', 'Sam Rivera', 'Avatar', 'PENDING_PAYMENT', '$212.75'],
                          ['SO-10479', 'Jordan Lee', 'Avatar', 'CANCELED', '$19.99'],
                        ]
                          .filter(
                            (r) =>
                              tab === 'all' ||
                              (tab === 'done'
                                ? ['COMPLETE', 'CANCELED'].includes(r[3])
                                : !['COMPLETE', 'CANCELED'].includes(r[3])),
                          )
                          .map((r, i) => (
                            <TR key={r[0]} data-state={i === 1 ? 'selected' : undefined}>
                              <TD>
                                <Checkbox aria-label={`Select ${r[0]}`} defaultChecked={i === 1} />
                              </TD>
                              <TD className="font-mono font-medium">{r[0]}</TD>
                              <TD>
                                <span className="flex items-center gap-2.5">
                                  <Avatar name={r[1]} className="size-7 text-caption" />
                                  {r[1]}
                                </span>
                              </TD>
                              <TD>
                                <StatusBadge status={r[3]} />
                              </TD>
                              <TD data-align="right" className="font-medium">
                                {r[4]}
                              </TD>
                            </TR>
                          ))}
                      </TBody>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          </Section>

          <Section
            id="feedback"
            title="Feedback"
            lead="Every list has an empty state that says what is missing and what to do. Loading uses skeletons in the final layout; toasts confirm actions without blocking."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <EmptyState
                  icon={<Inbox />}
                  title="No orders yet"
                  description="Orders placed on your storefronts will show up here."
                  action={
                    <Button variant="secondary" size="sm">
                      View storefront
                    </Button>
                  }
                />
              </Card>
              <Card>
                <CardBody className="grid gap-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9" />
                  <Skeleton className="h-9 w-2/3" />
                  <div className="flex items-center gap-2 pt-2 text-small text-fg-muted">
                    <Spinner /> Loading…
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  toast.success('Saved', {
                    description: 'Your changes are live.',
                  })
                }
              >
                Success toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast.error('Could not save', {
                    description: 'The SKU is already in use.',
                  })
                }
              >
                Error toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast('Import queued', {
                    description: 'We will notify you when it finishes.',
                  })
                }
              >
                Info toast
              </Button>
            </div>
          </Section>

          <Section
            id="overlays"
            title="Overlays"
            lead="Dialogs confirm or collect a few fields; anything longer gets its own page. Menus for row actions; tooltips label icon-only buttons."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open dialog</Button>
                </DialogTrigger>
                <DialogContent
                  title="Delete 3 products?"
                  description="They will be removed from every store. Orders that contain them are not affected."
                  footer={
                    <>
                      <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="danger">Delete products</Button>
                      </DialogClose>
                    </>
                  }
                />
              </Dialog>
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="secondary">
                    Row actions
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent align="start">
                  <MenuItem>
                    <Pencil />
                    Edit
                  </MenuItem>
                  <MenuItem>
                    <Download />
                    Download invoice
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem destructive>
                    <Trash2 />
                    Delete
                  </MenuItem>
                </MenuContent>
              </Menu>
              <Tooltip content="3 unread notifications">
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell />
                </Button>
              </Tooltip>
              <span className="text-small text-fg-muted">
                Open search anywhere with <Kbd>⌘K</Kbd>
              </span>
            </div>
          </Section>

          <Section
            id="patterns"
            title="Patterns"
            lead="Building blocks of catalog screens: searchable pickers, choice cards, sortable lists, uploads, side panels, pagination and the sticky save bar that appears while a form has unsaved changes."
          >
            <PatternsDemo />
          </Section>
        </main>
      </div>
    </div>
  );
}
