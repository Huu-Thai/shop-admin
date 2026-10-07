'use client';

import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/controls';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { RadioGroup, Radio } from '@/components/ui/radio';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import type { Schemas } from '@/server/api';
import { labelOf } from '../shared';
import type { FormValue } from './attribute-values';

/** One attribute's control, chosen by its type (docs/STYLE-GUIDE.md §7 Inputs). */
export function AttributeField({
  attribute: a,
  value,
  onChange,
  error,
  disabled,
  idPrefix = 'attr',
}: {
  attribute: Schemas['AttributeDto'];
  value: FormValue;
  onChange: (v: FormValue) => void;
  error?: string;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const { t, locale } = useI18n();
  const id = `${idPrefix}-${a.code}`;
  const label = labelOf(a.labels, locale, a.code);
  const options = [...a.options]
    .sort((x, y) => x.position - y.position)
    .map((o) => ({ value: o.code, label: labelOf(o.labels, locale, o.code), swatch: o.swatch }));
  const err = error ? t(error as MessageKey) : undefined;
  const aria = {
    'aria-invalid': !!err || undefined,
    'aria-describedby': err ? `${id}-error` : undefined,
  };

  let control;
  switch (a.type) {
    case 'TEXTAREA':
      control = (
        <Textarea
          id={id}
          rows={3}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          {...aria}
        />
      );
      break;
    case 'INTEGER':
    case 'DECIMAL':
      control = (
        <Input
          id={id}
          inputMode={a.type === 'INTEGER' ? 'numeric' : 'decimal'}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="tabular"
          {...aria}
        />
      );
      break;
    case 'DATE':
      control = (
        <Input
          id={id}
          type="date"
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          {...aria}
        />
      );
      break;
    case 'BOOLEAN':
      control = (
        <RadioGroup
          value={value === true ? 'yes' : value === false ? 'no' : 'unset'}
          onValueChange={(v) => onChange(v === 'yes' ? true : v === 'no' ? false : null)}
          disabled={disabled}
          className="flex flex-wrap gap-4"
          aria-labelledby={`${id}-label`}
        >
          <Radio id={`${id}-yes`} value="yes" label={t('common.yes')} />
          <Radio id={`${id}-no`} value="no" label={t('common.no')} />
          {!a.isRequired && <Radio id={`${id}-unset`} value="unset" label={t('attrv.notSet')} />}
        </RadioGroup>
      );
      break;
    case 'SELECT':
      control = (
        <Select
          value={typeof value === 'string' && value ? value : '__none'}
          onValueChange={(v) => onChange(v === '__none' ? '' : v)}
          disabled={disabled}
        >
          <SelectTrigger id={id} {...aria} />
          <SelectContent>
            {!a.isRequired && <SelectItem value="__none">{t('attrv.notSet')}</SelectItem>}
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2">
                  {o.swatch && (
                    <span
                      aria-hidden
                      className="size-3.5 rounded-full border border-border-strong"
                      style={{ background: o.swatch }}
                    />
                  )}
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case 'MULTISELECT':
      control = (
        <Combobox
          id={id}
          multiple
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          options={options}
          disabled={disabled}
          invalid={!!err}
          placeholder={t('common.select')}
          searchPlaceholder={t('common.search')}
          emptyText={t('common.noResults')}
        />
      );
      break;
    default:
      control = (
        <Input
          id={id}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          {...aria}
        />
      );
  }

  return (
    <Field
      id={id}
      label={<span id={`${id}-label`}>{label}</span>}
      required={a.isRequired}
      error={err}
    >
      {control}
    </Field>
  );
}
