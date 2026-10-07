'use client';

import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n/client';
import { signIn, type SignInState } from '@/server/auth-actions';

export function LoginForm({
  next,
  demo,
}: {
  next: string;
  /** Public demo account, prefilled (demo mode only). */
  demo?: { email: string; password: string };
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const [show, setShow] = useState(false);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="mt-8 grid gap-5" noValidate>
      {state.error && (
        <div
          role="alert"
          className="flex gap-2.5 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-3 text-small text-danger-fg"
        >
          <AlertCircle aria-hidden className="mt-px size-4 shrink-0" />
          {state.error}
        </div>
      )}
      <input type="hidden" name="next" value={next} />
      <Field id="email" label={t('login.email')} error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          defaultValue={state.email ?? demo?.email}
          aria-invalid={!!fe.email || undefined}
          aria-describedby={fe.email ? 'email-error' : undefined}
          className="h-11"
        />
      </Field>
      <Field id="password" label={t('login.password')} error={fe.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            defaultValue={demo?.password}
            aria-invalid={!!fe.password || undefined}
            aria-describedby={fe.password ? 'password-error' : undefined}
            className="h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? t('login.hide') : t('login.show')}
            aria-pressed={show}
            className="focus-ring absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-sm text-fg-muted hover:text-fg"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
        {t('login.submit')}
      </Button>
    </form>
  );
}
