'use client';

import { Eye, EyeOff, KeyRound, Plus, Trash2, UserCog, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Switch } from '@/components/ui/controls';
import { Confirm } from '@/components/ui/confirm';
import { Avatar, EmptyState } from '@/components/ui/feedback';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FilterSelect, ListToolbar, SearchField } from '@/components/ui/list-toolbar';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { formatDate } from '@/lib/format';
import { useQueryParams } from '@/lib/use-query-params';
import type { Schemas } from '@/server/api';
import { SubNav } from '../catalog/catalog-tabs';
import { generatePassword, passwordProblems } from '../customers/shared';
import { createUser, deleteUser, resetUserPassword, updateUser } from './actions';
import { ACCESS_TABS } from './tabs';

type User = Schemas['AdminUserDto'];
type Role = Schemas['RoleDto'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const name = (u: { firstName: string | null; lastName: string | null; email: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;

function UserStatus({ user }: { user: User }) {
  const { t } = useI18n();
  if (user.status === 'DISABLED') return <Badge tone="neutral">{t('usr.status.DISABLED')}</Badge>;
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date())
    return <Badge tone="warning">{t('usr.status.locked')}</Badge>;
  return (
    <Badge tone="success" dot>
      {t('usr.status.ACTIVE')}
    </Badge>
  );
}

/** Staff accounts: who can sign in to the back office, with which roles. */
export function UsersView({
  users,
  total,
  page,
  limit,
  roles,
  meId,
  canWrite,
}: {
  users: User[];
  total: number;
  page: number;
  limit: number;
  roles: Role[];
  meId: string;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const { params, set } = useQueryParams();
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const filtered = ['search', 'status'].some((k) => params.get(k));

  return (
    <>
      <PageHeader
        title={t('usr.title')}
        description={t('usr.description')}
        breadcrumbs={[{ label: t('nav.system') }, { label: t('usr.title') }]}
        actions={
          canWrite && (
            <Button onClick={() => setEditing('new')}>
              <Plus />
              {t('usr.new')}
            </Button>
          )
        }
      />
      <SubNav items={ACCESS_TABS} />
      <Card className="overflow-hidden">
        <ListToolbar>
          <SearchField placeholder={t('cust.search')} />
          <FilterSelect
            param="status"
            label={t('common.status')}
            allLabel={t('orders.anyStatus')}
            options={(['ACTIVE', 'DISABLED'] as const).map((s) => ({
              value: s,
              label: t(`usr.status.${s}`),
            }))}
          />
        </ListToolbar>
        {users.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('usr.user')}</TH>
                <TH className="hidden md:table-cell">{t('role.title')}</TH>
                <TH>{t('common.status')}</TH>
                <TH className="hidden sm:table-cell" data-align="right">
                  {t('cust.lastLogin')}
                </TH>
                <TH data-align="right">
                  <span className="sr-only">{t('list.actions')}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={name(u)} className="size-8 text-caption" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 truncate font-medium">
                          {name(u)}
                          {u.id === meId && <Badge tone="accent">{t('usr.you')}</Badge>}
                        </span>
                        <span className="block max-w-[260px] truncate text-small text-fg-muted">
                          {u.email}
                        </span>
                      </span>
                    </span>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r.id} tone="neutral">
                          {r.name}
                        </Badge>
                      ))}
                    </span>
                  </TD>
                  <TD>
                    <UserStatus user={u} />
                  </TD>
                  <TD
                    data-align="right"
                    className="hidden whitespace-nowrap text-fg-muted sm:table-cell"
                  >
                    {u.lastLoginAt ? formatDate(u.lastLoginAt, intl, true) : t('cust.never')}
                  </TD>
                  <TD data-align="right">
                    {canWrite && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                        {t('common.edit')}
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<UserCog />}
            title={filtered ? t('list.noMatch') : t('usr.empty')}
            action={
              filtered && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => set({ search: null, status: null })}
                >
                  {t('list.clearFilters')}
                </Button>
              )
            }
          />
        )}
        {total > 0 && <Pagination page={page} limit={limit} total={total} />}
      </Card>
      {editing && (
        <UserSheet
          user={editing === 'new' ? null : editing}
          roles={roles}
          isMe={editing !== 'new' && editing.id === meId}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  error,
  label,
  hint,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label: string;
  hint?: string;
}) {
  const { t } = useI18n();
  const [reveal, setReveal] = useState(false);
  return (
    <Field id={id} label={label} required hint={hint} error={error}>
      <div className="flex gap-2">
        <Input
          id={id}
          type={reveal ? 'text' : 'password'}
          autoComplete="new-password"
          className="font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={reveal ? t('cust.hidePassword') : t('cust.showPassword')}
          onClick={() => setReveal((r) => !r)}
        >
          {reveal ? <EyeOff /> : <Eye />}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            onChange(generatePassword());
            setReveal(true);
          }}
        >
          <Wand2 />
          {t('cust.generate')}
        </Button>
      </div>
    </Field>
  );
}

function UserSheet({
  user,
  roles,
  isMe,
  onClose,
}: {
  user: User | null;
  roles: Role[];
  isMe: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState(user?.email ?? '');
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [roleIds, setRoleIds] = useState<string[]>(user?.roles.map((r) => r.id) ?? []);
  const [active, setActive] = useState(user ? user.status === 'ACTIVE' : true);
  const [password, setPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const pw = passwordProblems(password, email);
  const errors = {
    email: !user && !EMAIL.test(email.trim()) ? t('cust.err.email') : undefined,
    roles: !roleIds.length ? t('usr.err.roles') : undefined,
    password:
      (!user || resetting) && pw.length ? pw.map((p) => t(`cust.pw.${p}`)).join(' ') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    let ok: unknown;
    if (user) {
      ok = await runAction(
        updateUser(user.id, {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          ...(isMe ? {} : { roleIds, status: active ? 'ACTIVE' : 'DISABLED' }),
        }),
        { success: t('common.saved') },
      );
      if (ok && resetting)
        ok = await runAction(resetUserPassword(user.id, password), {
          success: t('usr.passwordReset'),
        });
    } else {
      ok = await runAction(
        createUser({
          email: email.trim(),
          password,
          ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
          ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
          roleIds,
        }),
        { success: t('usr.created') },
      );
    }
    setSaving(false);
    if (ok !== undefined) {
      onClose();
      router.refresh();
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={user ? name(user) : t('usr.new')}
        description={user ? user.email : t('usr.newHint')}
        footer={
          <>
            {user && !isMe && (
              <Confirm
                trigger={
                  <Button variant="ghost" className="mr-auto text-danger-fg">
                    <Trash2 />
                    {t('common.delete')}
                  </Button>
                }
                title={t('usr.deleteTitle', { name: name(user) })}
                description={t('usr.deleteBody')}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={async () => {
                  const ok = await runAction(deleteUser(user.id), { success: t('usr.deleted') });
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
              {user ? t('common.save') : t('usr.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          {!user && (
            <Field
              id="au-email"
              label={t('cust.email')}
              required
              error={touched ? errors.email : undefined}
            >
              <Input
                id="au-email"
                type="email"
                autoComplete="off"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="au-first" label={t('cust.firstName')}>
              <Input
                id="au-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>
            <Field id="au-last" label={t('cust.lastName')}>
              <Input id="au-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
          {!user && (
            <PasswordInput
              id="au-password"
              label={t('cust.password')}
              hint={t('usr.passwordHint')}
              value={password}
              onChange={setPassword}
              error={touched ? errors.password : undefined}
            />
          )}
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-small font-medium">
              {t('role.title')} <span className="text-danger-fg">*</span>
            </legend>
            {isMe && <p className="text-small text-fg-muted">{t('usr.ownRoles')}</p>}
            <div className="grid gap-2 rounded-lg border border-border p-3">
              {roles.map((r) => (
                <label key={r.id} className="flex items-start gap-2.5">
                  <Checkbox
                    className="mt-0.5"
                    disabled={isMe}
                    checked={roleIds.includes(r.id)}
                    onCheckedChange={(c) =>
                      setRoleIds((ids) =>
                        c === true ? [...ids, r.id] : ids.filter((x) => x !== r.id),
                      )
                    }
                  />
                  <span>
                    <span className="block text-body font-medium">{r.name}</span>
                    {r.description && (
                      <span className="block text-small text-fg-muted">{r.description}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {touched && errors.roles && <p className="text-small text-danger-fg">{errors.roles}</p>}
          </fieldset>
          {user && !isMe && (
            <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <span>
                <span className="block text-body font-medium">{t('usr.canSignIn')}</span>
                <span className="block text-small text-fg-muted">{t('usr.canSignInHint')}</span>
              </span>
              <Switch checked={active} onCheckedChange={setActive} />
            </label>
          )}
          {user && !isMe && (
            <div className="grid gap-3 rounded-lg border border-border p-4">
              {resetting ? (
                <PasswordInput
                  id="au-reset"
                  label={t('usr.newPassword')}
                  hint={t('usr.resetHint')}
                  value={password}
                  onChange={setPassword}
                  error={touched ? errors.password : undefined}
                />
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <span>
                    <Label className="block">{t('usr.resetPassword')}</Label>
                    <span className="text-small text-fg-muted">{t('usr.resetHint')}</span>
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => setResetting(true)}>
                    <KeyRound />
                    {t('usr.setPassword')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
