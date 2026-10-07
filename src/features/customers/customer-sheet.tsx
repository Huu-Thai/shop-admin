'use client';

import { Eye, EyeOff, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, Switch } from '@/components/ui/controls';
import { Field, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { createCustomer } from './actions';
import { generatePassword, passwordProblems } from './shared';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_LOCALE = '__default';

/** Creates a storefront account on behalf of a shopper (phone orders, B2B onboarding). */
export function CustomerSheet({
  groups,
  websites,
  locales,
  onClose,
}: {
  groups: Schemas['CustomerGroupDto'][];
  websites: Schemas['WebsiteDto'][];
  locales: Schemas['LocaleDto'][];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [localeCode, setLocaleCode] = useState(DEFAULT_LOCALE);
  const [groupCode, setGroupCode] = useState(
    groups.find((g) => g.code === 'general')?.code ??
      groups.find((g) => g.code !== 'guest')?.code ??
      '',
  );
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const problems = passwordProblems(password, email);
  const errors = {
    email: !EMAIL.test(email.trim()) ? t('cust.err.email') : undefined,
    firstName: !firstName.trim() ? t('cust.err.firstName') : undefined,
    lastName: !lastName.trim() ? t('cust.err.lastName') : undefined,
    password: problems.length ? problems.map((p) => t(`cust.pw.${p}`)).join(' ') : undefined,
  };

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const created = await runAction(
      createCustomer({
        websiteId,
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(localeCode !== DEFAULT_LOCALE ? { localeCode } : {}),
        ...(groupCode ? { groupCode } : {}),
        acceptsMarketing,
      }),
      { success: t('cust.created') },
    );
    setSaving(false);
    if (created) {
      onClose();
      router.push(`/customers/${created.id}`);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={t('cust.new')}
        description={t('cust.newHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('cust.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          {websites.length > 1 && (
            <div className="grid gap-1.5">
              <Label htmlFor="cu-website">{t('cust.website')}</Label>
              <Select value={websiteId} onValueChange={setWebsiteId}>
                <SelectTrigger id="cu-website" />
                <SelectContent>
                  {websites.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Field
            id="cu-email"
            label={t('cust.email')}
            required
            error={touched ? errors.email : undefined}
          >
            <Input
              id="cu-email"
              type="email"
              autoComplete="off"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="cu-first"
              label={t('cust.firstName')}
              required
              error={touched ? errors.firstName : undefined}
            >
              <Input
                id="cu-first"
                autoComplete="off"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>
            <Field
              id="cu-last"
              label={t('cust.lastName')}
              required
              error={touched ? errors.lastName : undefined}
            >
              <Input
                id="cu-last"
                autoComplete="off"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Field>
          </div>
          <Field
            id="cu-password"
            label={t('cust.password')}
            required
            hint={t('cust.passwordHint')}
            error={touched ? errors.password : undefined}
          >
            <div className="flex gap-2">
              <Input
                id="cu-password"
                type={reveal ? 'text' : 'password'}
                autoComplete="new-password"
                className="font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                variant="secondary"
                size="icon"
                aria-label={reveal ? t('cust.hidePassword') : t('cust.showPassword')}
                onClick={() => setReveal((r) => !r)}
              >
                {reveal ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPassword(generatePassword());
                  setReveal(true);
                }}
              >
                <Wand2 />
                {t('cust.generate')}
              </Button>
            </div>
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="cu-phone" label={t('cust.phone')}>
              <Input
                id="cu-phone"
                type="tel"
                autoComplete="off"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="cu-locale">{t('common.language')}</Label>
              <Select value={localeCode} onValueChange={setLocaleCode}>
                <SelectTrigger id="cu-locale" />
                <SelectContent>
                  <SelectItem value={DEFAULT_LOCALE}>{t('cust.storeLanguage')}</SelectItem>
                  {locales.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cu-group">{t('price.group')}</Label>
            <Select value={groupCode} onValueChange={setGroupCode}>
              <SelectTrigger id="cu-group" />
              <SelectContent>
                {groups
                  .filter((g) => g.code !== 'guest')
                  .map((g) => (
                    <SelectItem key={g.id} value={g.code}>
                      {g.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <span className="block text-body font-medium">{t('cust.marketing')}</span>
              <span className="block text-small text-fg-muted">{t('cust.marketingHint')}</span>
            </span>
            <Switch checked={acceptsMarketing} onCheckedChange={setAcceptsMarketing} />
          </label>
        </div>
      </SheetContent>
    </Sheet>
  );
}
