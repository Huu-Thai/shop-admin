'use client';

import { CalendarClock, Play, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { codify } from '../catalog/shared';
import {
  buildParams,
  CRON,
  CRON_PRESETS,
  type FormValue,
  formFromParams,
  JOB_FIELDS,
  JOB_TABS,
} from './job-params';
import { createJob, deleteJob, runSavedJob, updateJob } from './jobs-actions';
import { type JobRefs, ParamsForm, parseJsonParams } from './params-form';

type Job = Schemas['JobDto'];
type JobType = Schemas['JobTypeDto'];
const CUSTOM = '__custom';
const ON_DEMAND = '__none';

/** Saved jobs: an export or tool with fixed parameters, run on a cron schedule or on demand. */
export function ScheduledView({
  jobs,
  types,
  refs,
  canWrite,
}: {
  jobs: Job[];
  types: JobType[];
  refs: JobRefs;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const [editing, setEditing] = useState<Job | 'new' | null>(null);
  const title = (type: string) => types.find((x) => x.type === type)?.title ?? type;
  const schedule = (cron: string | null | undefined) => {
    if (!cron) return t('job.onDemand');
    const preset = CRON_PRESETS.find((p) => p.cron === cron);
    return preset ? t(preset.label) : cron;
  };

  return (
    <>
      <PageHeader
        title={t('job.scheduledTitle')}
        description={t('job.scheduledDescription')}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('job.title'), href: '/jobs' },
          { label: t('job.scheduled') },
        ]}
        actions={
          canWrite && (
            <Button onClick={() => setEditing('new')}>
              <Plus />
              {t('job.newScheduled')}
            </Button>
          )
        }
      />
      <SubNav items={JOB_TABS} />
      <Card className="overflow-hidden">
        {jobs.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.name')}</TH>
                <TH>{t('job.schedule')}</TH>
                <TH className="hidden md:table-cell">{t('job.nextRun')}</TH>
                <TH className="hidden lg:table-cell">{t('job.lastRun')}</TH>
                <TH>{t('common.status')}</TH>
                <TH data-align="right">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {jobs.map((j) => (
                <TR key={j.id}>
                  <TD>
                    <span className="block font-medium">{j.name}</span>
                    <span className="text-caption text-fg-muted">{title(j.type)}</span>
                  </TD>
                  <TD className="text-small">
                    {schedule(j.cron)}
                    {j.cron && (
                      <span className="block font-mono text-caption text-fg-muted">
                        {j.timezone}
                      </span>
                    )}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-fg-muted md:table-cell">
                    {j.nextRunAt && j.isActive ? formatDate(j.nextRunAt, intl, true) : '—'}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-fg-muted lg:table-cell">
                    {j.lastRunAt ? formatDate(j.lastRunAt, intl, true) : t('cust.never')}
                  </TD>
                  <TD>
                    {j.isActive ? (
                      <Badge tone="success" dot>
                        {t('common.active')}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">{t('loy.paused')}</Badge>
                    )}
                  </TD>
                  <TD data-align="right">
                    {canWrite && (
                      <span className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const e = await runAction(runSavedJob(j.id), {
                              success: t('job.started'),
                            });
                            if (e) router.push(`/jobs/${e.id}`);
                          }}
                        >
                          <Play />
                          {t('job.runNow')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(j)}>
                          {t('common.edit')}
                        </Button>
                      </span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<CalendarClock />}
            title={t('job.noScheduled')}
            description={t('job.noScheduledBody')}
            action={
              canWrite && (
                <Button size="sm" onClick={() => setEditing('new')}>
                  <Plus />
                  {t('job.newScheduled')}
                </Button>
              )
            }
          />
        )}
      </Card>
      {editing && (
        <JobSheet
          job={editing === 'new' ? null : editing}
          types={types.filter((x) => !x.input)}
          refs={refs}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function JobSheet({
  job,
  types,
  refs,
  onClose,
}: {
  job: Job | null;
  types: JobType[];
  refs: JobRefs;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(job?.name ?? '');
  const [code, setCode] = useState(job?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(!!job);
  const [type, setType] = useState(job?.type ?? types[0]?.type ?? '');
  const fields = JOB_FIELDS[type];
  const [form, setForm] = useState<Record<string, FormValue>>(
    fields && job ? formFromParams(fields, job.params) : {},
  );
  const [json, setJson] = useState(!fields && job ? JSON.stringify(job.params, null, 2) : '');
  const presetOf = (c: string | null | undefined) =>
    !c ? ON_DEMAND : CRON_PRESETS.some((p) => p.cron === c) ? c : CUSTOM;
  const [preset, setPreset] = useState(presetOf(job?.cron ?? '0 2 * * *'));
  const [cron, setCron] = useState(job?.cron ?? '0 2 * * *');
  const [timezone, setTimezone] = useState(
    job?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  );
  const [isActive, setIsActive] = useState(job?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const built = fields ? buildParams(fields, form) : null;
  const parsed = fields ? null : parseJsonParams(json);
  const cronValue = preset === ON_DEMAND ? null : preset === CUSTOM ? cron.trim() : preset;
  const errors = {
    name: !name.trim() ? t('ban.err.name') : undefined,
    code: !/^[a-z][a-z0-9_-]{0,63}$/.test(code) ? t('cgroup.err.code') : undefined,
    cron: cronValue !== null && !CRON.test(cronValue) ? t('job.err.cron') : undefined,
    params: built ? built.missing.length + built.invalid.length > 0 : !!parsed?.error,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const params = (built ? built.params : parsed?.params) ?? {};
    const ok = job
      ? await runAction(
          updateJob(job.id, { name: name.trim(), params, cron: cronValue, timezone, isActive }),
          {
            success: t('common.saved'),
          },
        )
      : await runAction(
          createJob({ code, name: name.trim(), type, params, cron: cronValue, timezone, isActive }),
          {
            success: t('job.scheduledCreated'),
          },
        );
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={job ? job.name : t('job.newScheduled')}
        description={t('job.scheduledHint')}
        footer={
          <>
            {job && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('cms.deleteTitle', { title: job.name })}
                description={t('job.deleteBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteJob(job.id), { success: t('cms.deleted') });
                  if (ok !== undefined) {
                    onClose();
                    router.refresh();
                  }
                  return ok !== undefined;
                }}
              />
            )}
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="sj-name"
              label={t('common.name')}
              required
              error={touched ? errors.name : undefined}
            >
              <Input
                id="sj-name"
                autoFocus={!job}
                value={name}
                placeholder={t('job.namePlaceholder')}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!codeEdited) setCode(codify(e.target.value).replace(/_/g, '-'));
                }}
              />
            </Field>
            <Field
              id="sj-code"
              label={t('common.code')}
              required
              hint={job ? t('attr.codeLocked') : undefined}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="sj-code"
                className="font-mono"
                disabled={!!job}
                value={code}
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sj-type">{t('job.job')}</Label>
            <Select
              value={type}
              disabled={!!job}
              onValueChange={(v) => {
                setType(v);
                setForm({});
                setJson('');
              }}
            >
              <SelectTrigger id="sj-type" />
              <SelectContent>
                {types.map((x) => (
                  <SelectItem key={x.type} value={x.type}>
                    {x.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-small text-fg-muted">
              {types.find((x) => x.type === type)?.description}
            </p>
          </div>
          <fieldset className="grid gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-small font-semibold">{t('job.params')}</legend>
            <ParamsForm
              idPrefix="sj"
              fields={fields}
              value={form}
              onChange={setForm}
              refs={refs}
              errors={touched && built ? [...built.missing, ...built.invalid] : []}
              json={json}
              onJson={setJson}
              jsonError={touched && parsed?.error ? t(parsed.error) : undefined}
            />
          </fieldset>
          <fieldset className="grid gap-4 rounded-lg border border-border p-4">
            <legend className="px-1 text-small font-semibold">{t('job.schedule')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="sj-preset">{t('job.runs')}</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger id="sj-preset" />
                  <SelectContent>
                    <SelectItem value={ON_DEMAND}>{t('job.onDemand')}</SelectItem>
                    {CRON_PRESETS.map((p) => (
                      <SelectItem key={p.cron} value={p.cron}>
                        {t(p.label)}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM}>{t('job.customCron')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {preset !== ON_DEMAND && (
                <Field id="sj-tz" label={t('job.timezone')} hint={t('job.timezoneHint')}>
                  <Input
                    id="sj-tz"
                    className="font-mono"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </Field>
              )}
            </div>
            {preset === CUSTOM && (
              <Field
                id="sj-cron"
                label={t('job.cron')}
                hint={t('job.cronHint')}
                error={touched ? errors.cron : undefined}
              >
                <Input
                  id="sj-cron"
                  className="font-mono"
                  placeholder="30 6 * * 1-5"
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                />
              </Field>
            )}
          </fieldset>
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('common.active')}</span>
              <span className="block text-small text-fg-muted">{t('job.activeHint')}</span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
