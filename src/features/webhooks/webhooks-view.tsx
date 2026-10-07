'use client';

import { Plus, Webhook } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Switch } from '@/components/ui/controls';
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
import { SecretDialog } from '../access/api-keys-view';
import { createWebhook, updateWebhook } from './actions';
import { covers, groupEvents, toggleEvent, toggleGroup } from './events';

type Hook = Schemas['WebhookDto'];
type EventType = Schemas['WebhookEventTypeDto'];

export function HookStatus({ hook }: { hook: Hook }) {
  const { t } = useI18n();
  if (hook.disabledReason) return <Badge tone="danger">{t('wh2.status.failing')}</Badge>;
  if (!hook.isActive) return <Badge tone="neutral">{t('loy.paused')}</Badge>;
  if (hook.consecutiveFailures > 0) return <Badge tone="warning">{t('wh2.status.retrying')}</Badge>;
  return (
    <Badge tone="success" dot>
      {t('common.active')}
    </Badge>
  );
}

/** Outgoing webhooks: endpoints that receive signed events from the shop. */
export function WebhooksView({
  hooks,
  events,
  canWrite,
}: {
  hooks: Hook[];
  events: EventType[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title={t('wh2.title')}
        description={t('wh2.description')}
        breadcrumbs={[{ label: t('nav.system') }, { label: t('wh2.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('wh2.new')}
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        {hooks.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.name')}</TH>
                <TH className="hidden md:table-cell">{t('wh2.events')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('common.updated')}
                </TH>
              </tr>
            </THead>
            <TBody>
              {hooks.map((h) => (
                <TR key={h.id}>
                  <TD className="max-w-[420px]">
                    <Link
                      href={`/webhooks/${h.id}`}
                      className="focus-ring block rounded-xs font-medium hover:underline"
                    >
                      {h.name}
                    </Link>
                    <code className="block truncate font-mono text-caption text-fg-muted">
                      {h.url}
                    </code>
                  </TD>
                  <TD className="hidden max-w-[300px] md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {h.events.slice(0, 4).map((e) => (
                        <Badge key={e} tone="neutral" className="font-mono">
                          {e}
                        </Badge>
                      ))}
                      {h.events.length > 4 && (
                        <span className="text-caption text-fg-muted">+{h.events.length - 4}</span>
                      )}
                    </span>
                  </TD>
                  <TD>
                    <HookStatus hook={h} />
                  </TD>
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                  >
                    {formatDate(h.updatedAt, intl, true)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Webhook />}
            title={t('wh2.empty')}
            description={t('wh2.emptyBody')}
            action={
              canWrite && (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus />
                  {t('wh2.new')}
                </Button>
              )
            }
          />
        )}
      </Card>
      {creating && <WebhookSheet hook={null} events={events} onClose={() => setCreating(false)} />}
    </>
  );
}

/** Pick events by group (`order.*`) or one by one. */
function EventPicker({
  events,
  value,
  onChange,
  invalid,
}: {
  events: EventType[];
  value: string[];
  onChange: (v: string[]) => void;
  invalid?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className={`overflow-hidden rounded-lg border ${invalid ? 'border-danger' : 'border-border'}`}
    >
      {groupEvents(events).map((g, i) => {
        const all = value.includes(`${g.prefix}.*`);
        const some = g.events.some((e) => covers(value, e.type));
        return (
          <div key={g.prefix} className={i > 0 ? 'border-t border-border' : undefined}>
            <label className="flex items-center gap-2.5 bg-surface-muted/50 px-4 py-2 text-body font-medium">
              <Checkbox
                checked={all ? true : some ? 'indeterminate' : false}
                onCheckedChange={(c) => onChange(toggleGroup(value, g, c === true))}
              />
              <span className="font-mono">{g.prefix}.*</span>
              <span className="text-small font-normal text-fg-muted">
                {t('wh2.allOf', { n: g.events.length })}
              </span>
            </label>
            <div className="grid grid-cols-1 gap-1.5 px-4 py-2.5 sm:grid-cols-2">
              {g.events.map((e) => (
                <label
                  key={e.type}
                  className="flex items-start gap-2 text-small"
                  title={e.description}
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={covers(value, e.type)}
                    onCheckedChange={(c) => onChange(toggleEvent(value, e.type, c === true, g))}
                  />
                  <span className="min-w-0">
                    <span className="block font-mono">{e.type}</span>
                    <span className="block truncate text-caption text-fg-muted">
                      {e.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WebhookSheet({
  hook,
  events,
  onClose,
}: {
  hook: Hook | null;
  events: EventType[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(hook?.name ?? '');
  const [url, setUrl] = useState(hook?.url ?? 'https://');
  const [value, setValue] = useState<string[]>(hook?.events ?? []);
  const [isActive, setIsActive] = useState(hook?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState<{ id: string; secret: string } | null>(null);
  const parsed = (() => {
    try {
      return new URL(url.trim());
    } catch {
      return null;
    }
  })();
  const errors = {
    name: !name.trim() ? t('ban.err.name') : undefined,
    url:
      !parsed || !/^https?:$/.test(parsed.protocol)
        ? t('wh2.err.url')
        : parsed.username || parsed.password
          ? t('wh2.err.credentials')
          : undefined,
    events: !value.length ? t('wh2.err.events') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const body = { name: name.trim(), url: url.trim(), events: value, isActive };
    if (hook) {
      const ok = await runAction(updateWebhook(hook.id, body), { success: t('common.saved') });
      setSaving(false);
      if (ok) {
        onClose();
        router.refresh();
      }
      return;
    }
    const created = await runAction(createWebhook(body), { success: t('wh2.created') });
    setSaving(false);
    if (created) setSecret({ id: created.id, secret: created.secret });
  };

  if (secret)
    return (
      <SecretDialog
        name={name}
        secret={secret.secret}
        hint={t('wh2.secretHint')}
        title={t('wh2.secretTitle', { name: hook?.name ?? name })}
        onClose={() => {
          onClose();
          router.push(`/webhooks/${secret.id}`);
        }}
      />
    );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={hook ? hook.name : t('wh2.new')}
        description={t('wh2.sheetHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {hook ? t('common.save') : t('wh2.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <Field
            id="wh-name"
            label={t('common.name')}
            required
            error={touched ? errors.name : undefined}
          >
            <Input
              id="wh-name"
              autoFocus={!hook}
              value={name}
              placeholder="ERP orders"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            id="wh-url"
            label={t('wh2.url')}
            required
            hint={t('wh2.urlHint')}
            error={touched ? errors.url : undefined}
          >
            <Input
              id="wh-url"
              type="url"
              className="font-mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <div className="grid gap-2">
            <Label>
              {t('wh2.events')} <span className="text-danger-fg">*</span>
            </Label>
            <p className="text-small text-fg-muted">{t('wh2.eventsHint')}</p>
            <EventPicker
              events={events}
              value={value}
              onChange={setValue}
              invalid={touched && !!errors.events}
            />
            {touched && errors.events && (
              <p className="text-small text-danger-fg">{errors.events}</p>
            )}
          </div>
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('common.active')}</span>
              <span className="block text-small text-fg-muted">
                {hook?.disabledReason ? t('wh2.reactivateHint') : t('wh2.activeHint')}
              </span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
