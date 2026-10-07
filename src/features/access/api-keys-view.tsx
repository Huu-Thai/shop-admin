'use client';

import { AlertTriangle, Copy, KeyRound, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Checkbox, Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { createApiKey, revokeApiKey } from './actions';
import { PermissionMatrix, PermissionSummary } from './permission-matrix';
import { ACCESS_TABS, type Permission } from './tabs';

type Key = Schemas['ApiKeyDto'];

export function keyState(k: Key, now = new Date()): 'active' | 'expired' | 'revoked' {
  if (k.revokedAt) return 'revoked';
  if (k.expiresAt && new Date(k.expiresAt) <= now) return 'expired';
  return 'active';
}
const TONE = { active: 'success', expired: 'warning', revoked: 'neutral' } as const;

/** Keys for integrations (ERP, PIM, scripts): scoped permissions, shown once, revocable. */
export function ApiKeysView({
  keys,
  permissions,
  granted,
  canWrite,
}: {
  keys: Key[];
  permissions: Permission[];
  granted: string[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const router = useRouter();
  const { params, set } = useQueryParams();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Schemas['ApiKeyCreatedDto'] | null>(null);
  const showRevoked = params.get('revoked') === '1';

  return (
    <>
      <PageHeader
        title={t('key.title')}
        description={t('key.description')}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('usr.title'), href: '/users' },
          { label: t('key.title') },
        ]}
        actions={
          canWrite && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('key.new')}
            </Button>
          )
        }
      />
      <SubNav items={ACCESS_TABS} />
      <Card className="overflow-hidden">
        <div className="flex items-center justify-end gap-3 border-b border-border px-5 py-3">
          <label className="flex items-center gap-2 text-small text-fg-muted">
            <Switch
              checked={showRevoked}
              onCheckedChange={(on) => set({ revoked: on ? '1' : null })}
            />
            {t('key.showRevoked')}
          </label>
        </div>
        {keys.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('common.name')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden md:table-cell">{t('role.permissions')}</TH>
                <TH className="hidden lg:table-cell">{t('key.lastUsed')}</TH>
                <TH className="hidden lg:table-cell">{t('key.expires')}</TH>
                <TH data-align="right">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {keys.map((k) => {
                const state = keyState(k);
                return (
                  <TR key={k.id}>
                    <TD>
                      <span className="block font-medium">{k.name}</span>
                      <code className="font-mono text-caption text-fg-muted">{k.prefix}…</code>
                      {k.createdBy && (
                        <span className="text-caption text-fg-muted"> · {k.createdBy}</span>
                      )}
                    </TD>
                    <TD>
                      <Badge tone={TONE[state]}>{t(`key.state.${state}`)}</Badge>
                    </TD>
                    <TD className="hidden text-small text-fg-muted md:table-cell">
                      <PermissionSummary value={k.permissions} />
                    </TD>
                    <TD className="hidden whitespace-nowrap text-fg-muted lg:table-cell">
                      {k.lastUsedAt ? formatDate(k.lastUsedAt, intl, true) : t('cust.never')}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-fg-muted lg:table-cell">
                      {k.expiresAt ? formatDate(k.expiresAt, intl) : t('coupon.never')}
                    </TD>
                    <TD data-align="right">
                      {canWrite && state !== 'revoked' && (
                        <Confirm
                          trigger={
                            <Button size="sm" variant="ghost" className="text-danger-fg">
                              {t('key.revoke')}
                            </Button>
                          }
                          title={t('key.revokeTitle', { name: k.name })}
                          description={t('key.revokeBody')}
                          confirmLabel={t('key.revoke')}
                          cancelLabel={t('common.cancel')}
                          onConfirm={async () => {
                            const ok = await runAction(revokeApiKey(k.id), {
                              success: t('key.revoked'),
                            });
                            if (ok !== undefined) router.refresh();
                            return ok !== undefined;
                          }}
                        />
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<KeyRound />} title={t('key.empty')} description={t('key.emptyBody')} />
        )}
      </Card>
      {creating && (
        <KeySheet
          permissions={permissions}
          granted={granted}
          onClose={() => setCreating(false)}
          onCreated={(k) => {
            setCreating(false);
            setCreated(k);
            router.refresh();
          }}
        />
      )}
      {created && (
        <SecretDialog name={created.name} secret={created.key} onClose={() => setCreated(null)} />
      )}
    </>
  );
}

function KeySheet({
  permissions,
  granted,
  onClose,
  onCreated,
}: {
  permissions: Permission[];
  granted: string[];
  onClose: () => void;
  onCreated: (key: Schemas['ApiKeyCreatedDto']) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [expires, setExpires] = useState('');
  const [value, setValue] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    name: !name.trim() ? t('ban.err.name') : undefined,
    expires:
      expires && new Date(`${expires}T23:59:59`) <= new Date() ? t('pub.err.past') : undefined,
    permissions: !value.length ? t('role.err.permissions') : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const key = await runAction(
      createApiKey({
        name: name.trim(),
        permissions: value,
        ...(expires ? { expiresAt: new Date(`${expires}T23:59:59`).toISOString() } : {}),
      }),
    );
    setSaving(false);
    if (key) onCreated(key);
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={t('key.new')}
        description={t('key.newHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('key.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Field
              id="ak-name"
              label={t('common.name')}
              required
              hint={t('key.nameHint')}
              error={touched ? errors.name : undefined}
            >
              <Input
                id="ak-name"
                autoFocus
                value={name}
                placeholder="ERP sync"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field
              id="ak-expires"
              label={t('key.expires')}
              hint={t('key.expiresHint')}
              error={touched ? errors.expires : undefined}
            >
              <Input
                id="ak-expires"
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-2">
            <Label>{t('role.permissions')}</Label>
            <p className="text-small text-fg-muted">{t('key.permissionsHint')}</p>
            <PermissionMatrix
              permissions={permissions}
              value={value}
              onChange={setValue}
              granted={granted}
              invalid={touched && !!errors.permissions}
            />
            {touched && errors.permissions && (
              <p className="text-small text-danger-fg">{errors.permissions}</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Shows a secret exactly once, with copy; closing requires confirming it was saved. */
export function SecretDialog({
  name,
  secret,
  onClose,
  hint,
  title,
}: {
  name: string;
  secret: string;
  onClose: () => void;
  hint?: string;
  /** Defaults to "Your key for {name}". */
  title?: string;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && saved && onClose()}>
      <DialogContent
        title={title ?? t('key.secretTitle', { name })}
        description={hint ?? t('key.secretHint')}
        footer={
          <Button disabled={!saved} onClick={onClose}>
            {t('common.close')}
          </Button>
        }
      >
        <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-small text-warning-fg">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('key.onlyOnce')}
        </p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2">
          <code className="min-w-0 flex-1 font-mono text-small break-all select-all">{secret}</code>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('key.copy')}
            onClick={async () => {
              await navigator.clipboard?.writeText(secret).catch(() => undefined);
              toast.success(t('coupon.copied'));
            }}
          >
            <Copy />
          </Button>
        </div>
        <label className="flex items-center gap-2 text-body">
          <Checkbox checked={saved} onCheckedChange={(c) => setSaved(c === true)} />
          {t('key.savedIt')}
        </label>
      </DialogContent>
    </Dialog>
  );
}
