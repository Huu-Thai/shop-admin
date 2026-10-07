'use client';

import { FileSpreadsheet, FileUp, Upload, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dropzone } from '@/components/ui/dropzone';
import { EmptyState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page-header';
import { RadioCard, RadioGroup } from '@/components/ui/radio';
import { useI18n } from '@/i18n/client';
import { GatewayError, gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { buildParams, type FormValue, importTemplate, JOB_FIELDS, JOB_TABS } from './job-params';
import { type JobRefs, ParamsForm, parseJsonParams } from './params-form';

const MAX_BYTES = 50 * 1024 * 1024;

/** Upload a CSV for one of the import types; the worker processes it and reports row problems. */
export function ImportView({
  types,
  refs,
  locales,
  initialType,
  canWrite,
}: {
  types: Schemas['JobTypeDto'][];
  refs: JobRefs;
  locales: string[];
  initialType?: string;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const imports = types.filter((x) => x.input === 'csv');
  const [type, setType] = useState(
    imports.find((x) => x.type === initialType)?.type ?? imports[0]?.type ?? '',
  );
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>({});
  const [json, setJson] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const info = imports.find((x) => x.type === type);
  const fields = JOB_FIELDS[type];
  const built = fields ? buildParams(fields, form) : null;
  const parsed = fields ? null : parseJsonParams(json);
  const template = importTemplate(type, locales);
  const fileError = !file
    ? t('job.err.file')
    : file.size > MAX_BYTES
      ? t('job.err.tooBig')
      : undefined;

  const downloadTemplate = () => {
    if (!template) return;
    const url = URL.createObjectURL(new Blob([template], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type.replace('import.', '')}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const start = async () => {
    setTouched(true);
    const params = built ? built.params : parsed?.params;
    if (fileError || !params || (built && (built.missing.length || built.invalid.length))) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set('type', type);
      body.set('file', file!);
      if (Object.keys(params).length) body.set('params', JSON.stringify(params));
      const execution = await gw<Schemas['ExecutionDto']>('imports', { method: 'POST', body });
      toast.success(t('job.importStarted'));
      router.push(`/jobs/${execution.id}`);
    } catch (e) {
      toast.error(e instanceof GatewayError ? e.message : t('media.err.network'));
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('job.importTitle')}
        description={t('job.importDescription')}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('job.title'), href: '/jobs' },
          { label: t('job.import') },
        ]}
      />
      <SubNav items={JOB_TABS} />
      {!imports.length ? (
        <Card>
          <EmptyState icon={<FileUp />} title={t('job.noImports')} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <RadioGroup
            value={type}
            onValueChange={(v) => {
              setType(v);
              setForm({});
              setJson('');
              setTouched(false);
            }}
            className="grid gap-3"
            aria-label={t('job.whatToImport')}
          >
            {imports.map((x) => (
              <RadioCard
                key={x.type}
                id={`imp-${x.type}`}
                value={x.type}
                title={x.title}
                icon={<FileSpreadsheet />}
              />
            ))}
          </RadioGroup>
          {info && (
            <Card>
              <CardHeader
                title={info.title}
                description={info.description}
                actions={
                  template && (
                    <Button size="sm" variant="secondary" onClick={downloadTemplate}>
                      <FileSpreadsheet />
                      {t('job.template')}
                    </Button>
                  )
                }
              />
              <CardBody className="grid gap-5 pt-4">
                {file ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                    <FileSpreadsheet aria-hidden className="size-5 text-success" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{file.name}</span>
                      <span className="text-caption text-fg-muted">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t('common.remove')}
                      onClick={() => setFile(null)}
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <Dropzone
                    accept=".csv,text/csv"
                    disabled={!canWrite}
                    onFiles={([f]) => f && setFile(f)}
                    title={t('job.dropCsv')}
                    hint={t('job.dropCsvHint')}
                  />
                )}
                {touched && fileError && (
                  <p className="-mt-3 text-small text-danger-fg">{fileError}</p>
                )}
                <ParamsForm
                  idPrefix="imp"
                  fields={fields}
                  value={form}
                  onChange={setForm}
                  refs={refs}
                  errors={touched && built ? [...built.missing, ...built.invalid] : []}
                  json={json}
                  onJson={setJson}
                  jsonError={touched && parsed?.error ? t(parsed.error) : undefined}
                />
                <p className="rounded-md bg-surface-muted/60 px-4 py-3 text-small text-fg-muted">
                  {t('job.importNote')}
                </p>
                <Button
                  className="justify-self-start"
                  onClick={start}
                  loading={busy}
                  disabled={!canWrite}
                >
                  <Upload />
                  {t('job.startImport')}
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
