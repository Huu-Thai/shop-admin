import type { Metadata } from 'next';
import { Logo } from '@/components/shell/logo';
import { getT } from '@/i18n/server';
import { safeNext } from '@/lib/permissions';
import { env } from '@/server/env';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const t = await getT();
  const next = safeNext((await searchParams).next);
  const { DEMO_MODE, DEMO_EMAIL, DEMO_PASSWORD } = env();
  const demo =
    DEMO_MODE && DEMO_EMAIL && DEMO_PASSWORD
      ? { email: DEMO_EMAIL, password: DEMO_PASSWORD }
      : undefined;
  return (
    <main className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col px-4 py-8 sm:px-10 lg:px-16">
        <Logo className="text-fg" />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <h1 className="text-h1 tracking-[-0.02em] text-fg">{t('login.title')}</h1>
          <p className="mt-2 text-body text-fg-muted">{t('login.subtitle')}</p>
          {demo && (
            <div className="mt-6 rounded-lg border border-accent bg-accent-soft px-4 py-3 text-small text-fg">
              <p className="font-medium">{t('demo.loginTitle')}</p>
              <p className="mt-1 text-fg-muted">{t('demo.loginBody')}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-caption">
                <dt className="text-fg-muted">{t('login.email')}</dt>
                <dd>{demo.email}</dd>
                <dt className="text-fg-muted">{t('login.password')}</dt>
                <dd>{demo.password}</dd>
              </dl>
            </div>
          )}
          <LoginForm next={next} demo={demo} />
        </div>
        <p className="text-caption text-fg-subtle">© {new Date().getFullYear()}</p>
      </section>

      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-surface-inverse p-12 text-fg-inverse lg:flex lg:flex-col lg:justify-end"
      >
        <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-accent opacity-20 blur-3xl" />
        <div className="relative mb-auto grid max-w-[440px] gap-3 self-end">
          <PreviewCard label="Revenue" value="$48,290" delta="+12.4%" />
          <div className="grid grid-cols-2 gap-3">
            <PreviewCard label="Orders" value="1,284" delta="+8.1%" />
            <PreviewCard label="AOV" value="$37.61" delta="+3.9%" />
          </div>
          <div className="flex h-24 items-end gap-1.5 rounded-lg border border-white/10 bg-white/5 p-4">
            {[38, 52, 44, 61, 57, 72, 66, 80, 74, 92, 86, 100].map((h, i) => (
              <span
                key={i}
                className={
                  i === 11 ? 'flex-1 rounded-xs bg-accent' : 'flex-1 rounded-xs bg-white/20'
                }
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="relative max-w-[520px]">
          <p className="text-display font-semibold tracking-[-0.02em] text-white">
            {t('login.heroTitle')}
          </p>
          <p className="mt-4 text-body-lg text-fg-inverse-muted">{t('login.heroBody')}</p>
        </div>
      </aside>
    </main>
  );
}

function PreviewCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-caption text-ink-300">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="tabular text-h3 font-semibold text-white">{value}</p>
        <span className="rounded-xs bg-accent px-1.5 py-0.5 text-caption font-semibold text-ink-900">
          {delta}
        </span>
      </div>
    </div>
  );
}
