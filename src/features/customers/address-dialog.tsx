'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/controls';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { createAddress, updateAddress } from './actions';

type Address = Schemas['AddressDto'];
const FIELDS = [
  'firstName',
  'lastName',
  'company',
  'phone',
  'line1',
  'line2',
  'city',
  'regionCode',
  'postcode',
  'countryCode',
] as const;
type Key = (typeof FIELDS)[number];

/** Adds or edits one address book entry; blank optional fields are cleared. */
export function AddressDialog({
  customerId,
  address,
  defaults,
  onClose,
}: {
  customerId: string;
  address: Address | null;
  /** Name to prefill a new address with. */
  defaults: { firstName: string; lastName: string; countryCode?: string };
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [v, setV] = useState<Record<Key, string>>(
    Object.fromEntries(
      FIELDS.map((k) => [
        k,
        (address?.[k] ?? (defaults as Record<string, string | undefined>)[k] ?? '') as string,
      ]),
    ) as Record<Key, string>,
  );
  const [shipping, setShipping] = useState(address?.isDefaultShipping ?? false);
  const [billing, setBilling] = useState(address?.isDefaultBilling ?? false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const required = ['firstName', 'lastName', 'line1', 'city'] as const;
  const errors: Partial<Record<Key, string>> = {
    ...Object.fromEntries(
      required.filter((k) => !v[k].trim()).map((k) => [k, t('addr.err.required')]),
    ),
    ...(!/^[A-Za-z]{2}$/.test(v.countryCode.trim()) ? { countryCode: t('tax.err.country') } : {}),
  };
  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    const trimmed = Object.fromEntries(FIELDS.map((k) => [k, v[k].trim()])) as Record<Key, string>;
    trimmed.countryCode = trimmed.countryCode.toUpperCase();
    trimmed.regionCode = trimmed.regionCode.toUpperCase();
    const body = { ...trimmed, isDefaultShipping: shipping, isDefaultBilling: billing };
    const ok = address
      ? await runAction(updateAddress(customerId, address.id, body), { success: t('common.saved') })
      : await runAction(
          createAddress(
            customerId,
            Object.fromEntries(
              Object.entries(body).filter(([, x]) => x !== ''),
            ) as Schemas['CreateAddressDto'],
          ),
          { success: t('addr.added') },
        );
    setSaving(false);
    if (ok) {
      onClose();
      router.refresh();
    }
  };

  const field = (k: Key, label: string, opts: { required?: boolean; mono?: boolean } = {}) => (
    <Field
      id={`ad-${k}`}
      label={label}
      required={opts.required}
      error={touched ? errors[k] : undefined}
    >
      <Input
        id={`ad-${k}`}
        value={v[k]}
        onChange={set(k)}
        autoComplete="off"
        className={opts.mono ? 'font-mono uppercase' : undefined}
      />
    </Field>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={address ? t('addr.edit') : t('addr.add')}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field('firstName', t('cust.firstName'), { required: true })}
          {field('lastName', t('cust.lastName'), { required: true })}
          {field('company', t('addr.company'))}
          {field('phone', t('cust.phone'))}
          <div className="sm:col-span-2">{field('line1', t('addr.line1'), { required: true })}</div>
          <div className="sm:col-span-2">{field('line2', t('addr.line2'))}</div>
          {field('city', t('addr.city'), { required: true })}
          {field('postcode', t('addr.postcode'))}
          {field('regionCode', t('addr.region'), { mono: true })}
          {field('countryCode', t('addr.country'), { required: true, mono: true })}
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-body">
            <Checkbox checked={shipping} onCheckedChange={(c) => setShipping(c === true)} />
            {t('addr.defaultShipping')}
          </label>
          <label className="flex items-center gap-2 text-body">
            <Checkbox checked={billing} onCheckedChange={(c) => setBilling(c === true)} />
            {t('addr.defaultBilling')}
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
