'use client';

import { ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/components/ui/confirm';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Radio, RadioGroup } from '@/components/ui/radio';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { createProvider, deleteProvider, updateProvider } from './actions';
import {
  CREDENTIAL_KEYS,
  isSecret,
  missingCredentials,
  PROVIDER_CODES,
  type ProviderCode,
} from './shared';

/**
 * A payment provider and its credentials. Credentials are write-only: the API never returns them,
 * and saving new ones replaces the whole set.
 */
export function ProviderSheet({
  provider,
  onClose,
}: {
  provider: Schemas['ProviderDto'] | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = !!provider;
  const [code, setCode] = useState<ProviderCode>((provider?.code as ProviderCode) ?? 'STRIPE');
  const [name, setName] = useState(provider?.name ?? '');
  const [mode, setMode] = useState<'TEST' | 'LIVE'>(provider?.mode ?? 'TEST');
  const [isActive, setIsActive] = useState(provider?.isActive ?? true);
  const [replace, setReplace] = useState(!editing);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const keys = CREDENTIAL_KEYS[code];
  const missing = replace ? missingCredentials(code, creds) : [];
  const errors = {
    name: !name.trim() ? t('sets.err.name') : undefined,
    creds: missing.length ? t('pay.err.creds') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (errors.name || errors.creds) return;
    setSaving(true);
    const credentials =
      replace && keys.length
        ? Object.fromEntries(keys.map((k) => [k, creds[k].trim()]))
        : undefined;
    const ok = editing
      ? await runAction(
          updateProvider(provider.id, {
            name: name.trim(),
            mode,
            isActive,
            ...(credentials ? { credentials } : {}),
          }),
          { success: t('common.saved') },
        )
      : await runAction(
          createProvider({
            code,
            name: name.trim(),
            mode,
            isActive,
            ...(credentials ? { credentials } : {}),
          }),
          { success: t('pay.providerCreated') },
        );
    setSaving(false);
    if (ok) {
      setCreds({});
      onClose();
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        width="lg"
        title={editing ? provider.name : t('pay.newProvider')}
        description={t('pay.providerHint')}
        footer={
          <>
            {editing && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('pay.deleteProvider', { name: provider.name })}
                description={t('pay.deleteProviderBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteProvider(provider.id), {
                    success: t('pay.providerDeleted'),
                  });
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
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="pp-code">{t('pay.provider')}</Label>
              <Select
                value={code}
                onValueChange={(v) => setCode(v as ProviderCode)}
                disabled={editing}
              >
                <SelectTrigger id="pp-code" />
                <SelectContent>
                  {PROVIDER_CODES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`pay.code.${c}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              id="pp-name"
              label={t('pay.displayName')}
              required
              error={touched ? errors.name : undefined}
            >
              <Input
                id="pp-name"
                autoFocus
                value={name}
                placeholder={t(`pay.code.${code}` as Parameters<typeof t>[0])}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-2">
            <Label>{t('pay.mode')}</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as 'TEST' | 'LIVE')}
              className="flex flex-wrap gap-6"
            >
              <Radio id="pp-test" value="TEST" label={t('pay.test')} hint={t('pay.testHint')} />
              <Radio id="pp-live" value="LIVE" label={t('pay.live')} hint={t('pay.liveHint')} />
            </RadioGroup>
          </div>
          {keys.length > 0 && (
            <fieldset className="grid gap-4 rounded-lg border border-border p-4">
              <legend className="flex items-center gap-1.5 px-1 text-small font-medium text-fg">
                <ShieldCheck aria-hidden className="size-4 text-success-fg" />
                {t('pay.credentials')}
              </legend>
              {editing && (
                <label className="flex items-center justify-between gap-4">
                  <span className="grid gap-0.5">
                    <span className="text-body text-fg">{t('pay.replaceCredentials')}</span>
                    <span className="text-small text-fg-muted">
                      {provider.configured
                        ? t('pay.credentialsStored')
                        : t('pay.credentialsMissing')}
                    </span>
                  </span>
                  <Switch checked={replace} onCheckedChange={setReplace} />
                </label>
              )}
              {replace &&
                keys.map((k) => (
                  <Field
                    key={k}
                    id={`pp-${k}`}
                    label={k}
                    required
                    error={touched && missing.includes(k) ? t('pay.err.cred') : undefined}
                  >
                    <Input
                      id={`pp-${k}`}
                      type={isSecret(k) ? 'password' : 'text'}
                      autoComplete="off"
                      spellCheck={false}
                      value={creds[k] ?? ''}
                      onChange={(e) => setCreds((c) => ({ ...c, [k]: e.target.value }))}
                      className="font-mono"
                    />
                  </Field>
                ))}
              <p className="text-small text-fg-muted">{t('pay.credentialsHint')}</p>
            </fieldset>
          )}
          <label className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
            <span className="grid gap-0.5">
              <span className="text-body font-medium text-fg">{t('common.active')}</span>
              <span className="text-small text-fg-muted">{t('pay.activeHint')}</span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
