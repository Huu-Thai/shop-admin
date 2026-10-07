'use client';

import {
  ArrowRight,
  Coins,
  CreditCard,
  Globe,
  KeyRound,
  Languages,
  Monitor,
  Moon,
  Percent,
  ScrollText,
  Search,
  Sun,
  Truck,
  UserCog,
  Webhook,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Avatar } from '@/components/ui/feedback';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { hasPermission } from '@/lib/permissions';
import { applyPreset } from '@/lib/preferences';
import { usePreset } from '@/lib/use-document';
import type { Schemas } from '@/server/api';
import { signOut } from '@/server/auth-actions';
import { themeConfig } from '@/theme/config';
import { changeOwnPassword } from '../access/actions';
import { passwordProblems } from '../customers/shared';

const LINKS: {
  href: string;
  icon: React.ElementType;
  title: MessageKey;
  hint: MessageKey;
  permission: string;
}[] = [
  {
    href: '/stores',
    icon: Globe,
    title: 'site.title',
    hint: 'set.storesHint',
    permission: 'stores:read',
  },
  {
    href: '/stores/locales',
    icon: Languages,
    title: 'loc.title',
    hint: 'set.localesHint',
    permission: 'stores:read',
  },
  {
    href: '/stores/currencies',
    icon: Coins,
    title: 'cur.title',
    hint: 'set.currenciesHint',
    permission: 'stores:read',
  },
  {
    href: '/stores/search',
    icon: Search,
    title: 'srch.title',
    hint: 'set.searchHint',
    permission: 'catalog:read',
  },
  {
    href: '/payments',
    icon: CreditCard,
    title: 'nav.payments',
    hint: 'set.paymentsHint',
    permission: 'orders:read',
  },
  {
    href: '/shipping',
    icon: Truck,
    title: 'nav.shipping',
    hint: 'set.shippingHint',
    permission: 'orders:read',
  },
  {
    href: '/tax',
    icon: Percent,
    title: 'set.tax',
    hint: 'set.taxHint',
    permission: 'pricing:read',
  },
  {
    href: '/users',
    icon: UserCog,
    title: 'set.access',
    hint: 'set.accessHint',
    permission: 'admin-users:read',
  },
  {
    href: '/users/api-keys',
    icon: KeyRound,
    title: 'key.title',
    hint: 'set.keysHint',
    permission: 'api-keys:read',
  },
  {
    href: '/webhooks',
    icon: Webhook,
    title: 'wh2.title',
    hint: 'set.webhooksHint',
    permission: 'webhooks:read',
  },
  {
    href: '/jobs',
    icon: Workflow,
    title: 'job.title',
    hint: 'set.jobsHint',
    permission: 'jobs:read',
  },
  {
    href: '/audit',
    icon: ScrollText,
    title: 'audit.title',
    hint: 'set.auditHint',
    permission: 'audit-logs:read',
  },
];

/** Your account, how the admin looks to you, and every configuration screen you may open. */
export function SettingsView({
  me,
  apiHost,
  version,
}: {
  me: Schemas['MeDto'];
  apiHost: string;
  version: string;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const name = [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email;
  const links = LINKS.filter((l) => hasPermission(me.permissions, l.permission));

  return (
    <>
      <PageHeader
        title={t('nav.settings')}
        description={t('set.description')}
        breadcrumbs={[{ label: t('nav.system') }, { label: t('nav.settings') }]}
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-6">
          {links.length > 0 && (
            <Card>
              <CardHeader title={t('set.configuration')} description={t('set.configurationHint')} />
              <CardBody className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="focus-ring group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-muted/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted group-hover:text-fg [&_svg]:size-4">
                      <l.icon aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t(l.title)}</span>
                      <span className="block text-small text-fg-muted">{t(l.hint)}</span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="mt-1 size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}
          <AppearanceCard />
        </div>
        <div className="grid gap-6" id="account">
          <Card>
            <CardHeader title={t('set.account')} />
            <CardBody className="grid gap-4 pt-4">
              <div className="flex items-center gap-3">
                <Avatar name={name} className="size-11" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{name}</span>
                  {name !== me.email && (
                    <span className="block truncate text-small text-fg-muted">{me.email}</span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {me.roles.map((r) => (
                  <Badge key={r} tone="neutral">
                    {r}
                  </Badge>
                ))}
              </div>
              <p className="text-small text-fg-muted">
                {t('set.lastLogin', {
                  at: me.lastLoginAt ? formatDate(me.lastLoginAt, intl, true) : t('cust.never'),
                })}
              </p>
            </CardBody>
          </Card>
          <PasswordCard email={me.email} />
          <Card>
            <CardHeader title={t('set.about')} />
            <CardBody className="grid gap-2 pt-4 text-small">
              {[
                [t('set.version'), version],
                [t('set.api'), apiHost],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-fg-muted">{k}</span>
                  <code className="font-mono">{v}</code>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function AppearanceCard() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const preset = usePreset();
  return (
    <Card>
      <CardHeader title={t('user.appearance')} description={t('set.appearanceHint')} />
      <CardBody className="grid gap-5 pt-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('user.appearance')}>
          {(
            [
              ['light', Sun, 'user.light'],
              ['dark', Moon, 'user.dark'],
              ['system', Monitor, 'user.system'],
            ] as const
          ).map(([id, Icon, key]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={theme === id}
              onClick={() => setTheme(id)}
              className={cn(
                'focus-ring flex flex-col items-center gap-2 rounded-lg border p-4 text-small',
                theme === id
                  ? 'border-primary bg-surface-muted font-medium'
                  : 'border-border text-fg-muted hover:bg-surface-muted/50',
              )}
            >
              <Icon aria-hidden className="size-5" />
              {t(key)}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          <span className="text-small font-medium">{t('user.accent')}</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('user.accent')}>
            {themeConfig.presets.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={preset === p.id}
                onClick={() => applyPreset(p.id)}
                className={cn(
                  'focus-ring flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-small',
                  preset === p.id ? 'border-primary font-medium' : 'border-border text-fg-muted',
                )}
              >
                <span
                  aria-hidden
                  className="size-5 rounded-full border border-border-strong"
                  style={{ background: p.swatch }}
                />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function PasswordCard({ email }: { email: string }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const problems = passwordProblems(next, email);
  const errors = {
    current: !current ? t('set.err.current') : undefined,
    next: problems.length
      ? problems.map((p) => t(`cust.pw.${p}`)).join(' ')
      : next === current
        ? t('set.err.same')
        : undefined,
    confirm: confirm !== next ? t('set.err.confirm') : undefined,
  };
  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const ok = await runAction(changeOwnPassword({ currentPassword: current, newPassword: next }), {
      success: t('set.passwordChanged'),
    });
    setSaving(false);
    // The shop ends every session of this account, this one too: sign in again with the new password.
    if (ok !== undefined) await signOut();
  };
  return (
    <Card>
      <CardHeader title={t('set.password')} description={t('set.passwordHint')} />
      <CardBody className="grid gap-4 pt-4">
        <Field
          id="pw-current"
          label={t('set.currentPassword')}
          error={touched ? errors.current : undefined}
        >
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field
          id="pw-new"
          label={t('usr.newPassword')}
          hint={t('usr.passwordHint')}
          error={touched ? errors.next : undefined}
        >
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field
          id="pw-confirm"
          label={t('set.confirmPassword')}
          error={touched ? errors.confirm : undefined}
        >
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} loading={saving}>
            {t('set.changePassword')}
          </Button>
          <Button variant="ghost" className="text-danger-fg" onClick={() => signOut(true)}>
            {t('user.signOutAll')}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
