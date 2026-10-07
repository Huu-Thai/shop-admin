'use client';

import { Lock, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { codify } from '../catalog/shared';
import { createRole, deleteRole, updateRole } from './actions';
import { PermissionMatrix, PermissionSummary } from './permission-matrix';
import { ACCESS_TABS, type Permission } from './tabs';

type Role = Schemas['RoleDto'];
const ROLE_CODE = /^[a-z][a-z0-9_-]{0,63}$/;

/** Roles bundle permissions; admins get the union of their roles' permissions. */
export function RolesView({
  roles,
  permissions,
  granted,
  canWrite,
}: {
  roles: Role[];
  permissions: Permission[];
  granted: string[];
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<Role | 'new' | null>(null);
  const sorted = [...roles].sort(
    (a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name),
  );

  return (
    <>
      <PageHeader
        title={t('role.title')}
        description={t('role.description')}
        breadcrumbs={[
          { label: t('nav.system') },
          { label: t('usr.title'), href: '/users' },
          { label: t('role.title') },
        ]}
        actions={
          canWrite && (
            <Button onClick={() => setEditing('new')}>
              <Plus />
              {t('role.new')}
            </Button>
          )
        }
      />
      <SubNav items={ACCESS_TABS} />
      {sorted.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    {r.name}
                    {r.isSystem && (
                      <Badge tone="neutral">
                        <Lock aria-hidden className="size-3" />
                        {t('cgroup.system')}
                      </Badge>
                    )}
                  </span>
                }
                description={r.description ?? undefined}
              />
              <CardBody className="mt-auto flex items-center justify-between gap-3 pt-4 text-small text-fg-muted">
                <span className="flex flex-col">
                  <PermissionSummary value={r.permissions} />
                  <span>{t('role.users', { n: r.userCount })}</span>
                </span>
                <Button
                  size="sm"
                  variant={r.isSystem || !canWrite ? 'ghost' : 'secondary'}
                  onClick={() => setEditing(r)}
                >
                  {r.isSystem || !canWrite ? t('role.view') : t('common.edit')}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<ShieldCheck />} title={t('role.empty')} />
        </Card>
      )}
      {editing && (
        <RoleSheet
          role={editing === 'new' ? null : editing}
          permissions={permissions}
          granted={granted}
          readOnly={!canWrite || (editing !== 'new' && editing.isSystem)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function RoleSheet({
  role,
  permissions,
  granted,
  readOnly,
  onClose,
}: {
  role: Role | null;
  permissions: Permission[];
  granted: string[];
  readOnly: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(role?.name ?? '');
  const [code, setCode] = useState(role?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(!!role);
  const [description, setDescription] = useState(role?.description ?? '');
  const [value, setValue] = useState<string[]>(role?.permissions ?? []);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = {
    name: !name.trim() ? t('ban.err.name') : undefined,
    code: !ROLE_CODE.test(code) ? t('cgroup.err.code') : undefined,
    permissions: !value.length ? t('role.err.permissions') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const body = { name: name.trim(), description: description.trim(), permissions: value };
    const ok = role
      ? await runAction(updateRole(role.id, body), { success: t('common.saved') })
      : await runAction(createRole({ ...body, code }), { success: t('role.created') });
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
        title={role ? role.name : t('role.new')}
        description={role?.isSystem ? t('role.systemHint') : t('role.sheetHint')}
        footer={
          readOnly ? (
            <Button variant="ghost" onClick={onClose}>
              {t('common.close')}
            </Button>
          ) : (
            <>
              {role && (
                <Confirm
                  trigger={
                    <Button
                      variant="ghost"
                      className="mr-auto text-danger-fg"
                      disabled={role.userCount > 0}
                    >
                      <Trash2 />
                      {t('common.delete')}
                    </Button>
                  }
                  title={t('role.deleteTitle', { name: role.name })}
                  description={t('role.deleteBody')}
                  confirmLabel={t('common.delete')}
                  cancelLabel={t('common.cancel')}
                  onConfirm={async () => {
                    const ok = await runAction(deleteRole(role.id), { success: t('role.deleted') });
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
                {role ? t('common.save') : t('role.create')}
              </Button>
            </>
          )
        }
      >
        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="rl-name"
              label={t('common.name')}
              required
              error={touched ? errors.name : undefined}
            >
              <Input
                id="rl-name"
                autoFocus={!role}
                disabled={readOnly}
                value={name}
                placeholder={t('role.namePlaceholder')}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!codeEdited) setCode(codify(e.target.value).replace(/_/g, '-'));
                }}
              />
            </Field>
            <Field
              id="rl-code"
              label={t('common.code')}
              required
              hint={role ? t('attr.codeLocked') : undefined}
              error={touched ? errors.code : undefined}
            >
              <Input
                id="rl-code"
                className="font-mono"
                disabled={!!role}
                value={code}
                onChange={(e) => {
                  setCodeEdited(true);
                  setCode(e.target.value.toLowerCase());
                }}
              />
            </Field>
          </div>
          <Field id="rl-desc" label={t('cat.descriptionField')}>
            <Textarea
              id="rl-desc"
              rows={2}
              disabled={readOnly}
              value={description}
              placeholder={t('role.descPlaceholder')}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="grid gap-2">
            <Label>{t('role.permissions')}</Label>
            {!readOnly && <p className="text-small text-fg-muted">{t('role.permissionsHint')}</p>}
            <PermissionMatrix
              permissions={permissions}
              value={value}
              onChange={setValue}
              granted={granted}
              disabled={readOnly}
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
