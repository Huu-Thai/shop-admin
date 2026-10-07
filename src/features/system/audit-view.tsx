'use client';

import {
  Bot,
  ChevronDown,
  ChevronRight,
  Download,
  KeyRound,
  ScrollText,
  User,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';
import { FilterSelect, ListToolbar } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { entityHref, parseChanges } from './audit';
import { runJob } from './jobs-actions';

type Entry = Schemas['AuditLogDto'];

const ACTOR_ICON = { admin: User, 'api-key': KeyRound, system: Bot, customer: UserRound } as const;

/** Who changed what and when, with the field-level changes. */
export function AuditView({
  entries,
  total,
  page,
  limit,
  users,
  entityTypes,
  canExport,
}: {
  entries: Entry[];
  total: number;
  page: number;
  limit: number;
  users: { id: string; label: string }[];
  entityTypes: string[];
  canExport: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const { params, set } = useQueryParams();
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const filtered = ['entityType', 'action', 'actorId', 'from', 'to', 'entityId'].some((k) =>
    params.get(k),
  );
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const exportCsv = async () => {
    // The export needs a window: the chosen dates, or the last 30 days.
    const end = to ? new Date(`${to}T23:59:59`) : new Date();
    const start = from ? new Date(`${from}T00:00:00`) : new Date(end.getTime() - 30 * 86_400_000);
    setExporting(true);
    const ok = await runAction(
      runJob('export.audit-log', {
        from: start.toISOString(),
        to: end.toISOString(),
        ...(params.get('entityType') ? { entityType: params.get('entityType') } : {}),
        ...(params.get('action') ? { action: params.get('action') } : {}),
      }),
      { success: t('job.exportStarted') },
    );
    setExporting(false);
    if (ok) router.push('/jobs');
  };

  return (
    <>
      <PageHeader
        title={t('audit.title')}
        description={t('audit.description')}
        breadcrumbs={[{ label: t('nav.system') }, { label: t('audit.title') }]}
        actions={
          canExport && (
            <Button variant="secondary" onClick={exportCsv} loading={exporting}>
              <Download />
              {t('audit.export')}
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <ListToolbar>
          <Input
            aria-label={t('audit.action')}
            placeholder={t('audit.actionPlaceholder')}
            className="h-9 w-56 font-mono"
            defaultValue={params.get('action') ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                set({ action: e.currentTarget.value.trim() || null, page: null });
            }}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v !== (params.get('action') ?? '')) set({ action: v || null, page: null });
            }}
          />
          {entityTypes.length > 0 && (
            <FilterSelect
              param="entityType"
              label={t('audit.entity')}
              allLabel={t('audit.anyEntity')}
              options={entityTypes.map((e) => ({ value: e, label: e.replace(/_/g, ' ') }))}
            />
          )}
          {users.length > 0 && (
            <FilterSelect
              param="actorId"
              label={t('audit.actor')}
              allLabel={t('audit.anyone')}
              options={users.map((u) => ({ value: u.id, label: u.label }))}
            />
          )}
          <span className="flex items-center gap-1.5 text-small text-fg-muted">
            <Input
              type="date"
              aria-label={t('audit.from')}
              className="h-9 w-40"
              value={from}
              onChange={(e) => set({ from: e.target.value || null, page: null })}
            />
            –
            <Input
              type="date"
              aria-label={t('audit.to')}
              className="h-9 w-40"
              value={to}
              onChange={(e) => set({ to: e.target.value || null, page: null })}
            />
          </span>
        </ListToolbar>
        {entries.length ? (
          <Table>
            <THead>
              <tr>
                <TH className="w-8">
                  <span className="sr-only">{t('audit.details')}</span>
                </TH>
                <TH>{t('sched.when')}</TH>
                <TH>{t('audit.actor')}</TH>
                <TH>{t('audit.action')}</TH>
                <TH className="hidden md:table-cell">{t('audit.entity')}</TH>
              </tr>
            </THead>
            <TBody>
              {entries.map((e) => {
                const Icon = ACTOR_ICON[e.actorType] ?? User;
                const changes = parseChanges(e.changes);
                const href = entityHref(e.entityType, e.entityId);
                const expanded = open === e.id;
                return (
                  <Fragment key={e.id}>
                    <TR data-state={expanded ? 'selected' : undefined}>
                      <TD>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-expanded={expanded}
                          aria-label={t('audit.details')}
                          onClick={() => setOpen(expanded ? null : e.id)}
                        >
                          {expanded ? <ChevronDown /> : <ChevronRight />}
                        </Button>
                      </TD>
                      <TD className="whitespace-nowrap text-fg-muted">
                        {formatDate(e.createdAt, intl, true)}
                      </TD>
                      <TD className="max-w-[240px]">
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon
                            aria-label={t(`audit.actorType.${e.actorType}` as MessageKey)}
                            className="size-4 shrink-0 text-fg-muted"
                          />
                          <span className="truncate">{e.actorLabel}</span>
                        </span>
                      </TD>
                      <TD>
                        <code className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-mono text-small">
                          {e.action}
                        </code>
                      </TD>
                      <TD className="hidden max-w-[260px] md:table-cell">
                        <span className="block truncate text-small">
                          <span className="text-fg-muted">{e.entityType.replace(/_/g, ' ')}</span>
                          {e.entityId &&
                            (href ? (
                              <Link
                                href={href}
                                className="focus-ring ml-1.5 rounded-xs font-mono hover:underline"
                              >
                                {e.entityId.slice(0, 8)}
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="focus-ring ml-1.5 rounded-xs font-mono hover:underline"
                                title={t('audit.sameEntity')}
                                onClick={() => set({ entityId: e.entityId!, page: null })}
                              >
                                {e.entityId.slice(0, 8)}
                              </button>
                            ))}
                        </span>
                      </TD>
                    </TR>
                    {expanded && (
                      <tr className="bg-surface-muted/40">
                        <td colSpan={5} className="px-5 py-4">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                            <div className="min-w-0">
                              {!changes ? (
                                <p className="text-small text-fg-muted">{t('audit.noChanges')}</p>
                              ) : changes.kind === 'diff' ? (
                                <table className="w-full text-small">
                                  <thead>
                                    <tr className="text-left text-caption tracking-[0.04em] text-fg-muted uppercase">
                                      <th className="py-1 pr-4 font-semibold">
                                        {t('audit.field')}
                                      </th>
                                      <th className="py-1 pr-4 font-semibold">
                                        {t('audit.before')}
                                      </th>
                                      <th className="py-1 font-semibold">{t('audit.after')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {changes.rows.map((r) => (
                                      <tr
                                        key={r.field}
                                        className="border-t border-border align-top"
                                      >
                                        <td className="py-1.5 pr-4 font-mono">{r.field}</td>
                                        <td className="py-1.5 pr-4 break-all text-danger-fg line-through decoration-danger/40">
                                          {r.from}
                                        </td>
                                        <td className="py-1.5 break-all text-success-fg">{r.to}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <pre className="max-h-72 overflow-auto rounded-md bg-surface p-3 font-mono text-caption">
                                  {changes.text}
                                </pre>
                              )}
                            </div>
                            <dl className="grid content-start gap-1.5 text-caption">
                              {[
                                [
                                  t('audit.actorType'),
                                  t(`audit.actorType.${e.actorType}` as MessageKey),
                                ],
                                [t('audit.entityId'), e.entityId ?? '—'],
                                [t('audit.request'), e.requestId ?? '—'],
                                [t('audit.ip'), e.ip ?? '—'],
                              ].map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-3">
                                  <dt className="text-fg-muted">{k}</dt>
                                  <dd className={cn('truncate font-mono')} title={v}>
                                    {v}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<ScrollText />}
            title={filtered ? t('list.noMatch') : t('audit.empty')}
            action={
              filtered && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set({
                      entityType: null,
                      action: null,
                      actorId: null,
                      from: null,
                      to: null,
                      entityId: null,
                    })
                  }
                >
                  {t('list.clearFilters')}
                </Button>
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      <p className="mt-3 text-small text-fg-muted">{t('audit.footnote')}</p>
    </>
  );
}
