'use client';

import { Download, FileDown, Play, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { buildParams, type FormValue, JOB_FIELDS, JOB_TABS } from './job-params';
import { runJob } from './jobs-actions';
import { type JobRefs, ParamsForm, parseJsonParams } from './params-form';

type JobType = Schemas['JobTypeDto'];

/** Exports (CSV files to download) and maintenance tools, each run on demand. */
export function ExportView({
  types,
  refs,
  canRun,
}: {
  types: JobType[];
  refs: JobRefs;
  /** Types the admin may run (jobs:write plus the type's own permission). */
  canRun: string[];
}) {
  const { t } = useI18n();
  const [running, setRunning] = useState<JobType | null>(null);
  const exports = types.filter((x) => x.type.startsWith('export.'));
  const tools = types.filter((x) => !x.input && !x.type.startsWith('export.'));

  const grid = (list: JobType[], icon: React.ReactNode, verb: string, level: 2 | 3 = 2) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map((x) => (
        <Card key={x.type} className="flex flex-col">
          <CardHeader
            level={level}
            title={
              <span className="flex items-center gap-2">
                <span className="text-fg-muted [&_svg]:size-4">{icon}</span>
                {x.title}
              </span>
            }
            description={x.description}
          />
          <CardBody className="mt-auto pt-4">
            <Button
              size="sm"
              variant="secondary"
              disabled={!canRun.includes(x.type)}
              onClick={() => setRunning(x)}
            >
              {x.type.startsWith('export.') ? <Download /> : <Play />}
              {verb}
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('job.exportTitle')}
        description={t('job.exportDescription')}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('job.title'), href: '/jobs' },
          { label: t('job.export') },
        ]}
      />
      <SubNav items={JOB_TABS} />
      <div className="grid gap-8">
        {grid(exports, <FileDown />, t('job.exportVerb'))}
        {tools.length > 0 && (
          <section className="grid gap-4">
            <div>
              <h2 className="text-h3">{t('job.tools')}</h2>
              <p className="text-small text-fg-muted">{t('job.toolsHint')}</p>
            </div>
            {grid(tools, <Wrench />, t('job.runVerb'), 3)}
          </section>
        )}
      </div>
      {running && <RunDialog type={running} refs={refs} onClose={() => setRunning(null)} />}
    </>
  );
}

function RunDialog({ type, refs, onClose }: { type: JobType; refs: JobRefs; onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const fields = JOB_FIELDS[type.type];
  const [form, setForm] = useState<Record<string, FormValue>>({});
  const [json, setJson] = useState(
    type.exampleParams && !fields ? JSON.stringify(type.exampleParams, null, 2) : '',
  );
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const built = fields ? buildParams(fields, form) : null;
  const parsed = fields ? null : parseJsonParams(json);

  const run = async () => {
    setTouched(true);
    const params = built ? built.params : parsed?.params;
    if (!params || (built && (built.missing.length || built.invalid.length))) return;
    setBusy(true);
    const e = await runAction(runJob(type.type, params), { success: t('job.started') });
    setBusy(false);
    if (e) router.push(`/jobs/${e.id}`);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={type.title}
        description={type.description}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={run} loading={busy}>
              {type.type.startsWith('export.') ? <Download /> : <Play />}
              {type.type.startsWith('export.') ? t('job.exportVerb') : t('job.runVerb')}
            </Button>
          </>
        }
      >
        <ParamsForm
          idPrefix="run"
          fields={fields}
          value={form}
          onChange={setForm}
          refs={refs}
          errors={touched && built ? [...built.missing, ...built.invalid] : []}
          json={json}
          onJson={setJson}
          jsonError={touched && parsed?.error ? t(parsed.error) : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
