'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import type { RegionRow } from './regions';

/** Country / subdivision / postcode rows of a tax zone. */
export function RegionEditor({
  rows,
  onChange,
  errors,
  disabled,
}: {
  rows: RegionRow[];
  onChange: (rows: RegionRow[]) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const err = (k: string) => (errors[k] ? t(errors[k] as MessageKey) : undefined);
  const patch = (i: number, p: Partial<RegionRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_36px] gap-2 text-caption font-semibold tracking-[0.04em] text-fg-muted uppercase">
        <span>{t('tax.country')}</span>
        <span>{t('tax.region')}</span>
        <span>{t('tax.postcode')}</span>
        <span />
      </div>
      {rows.map((r, i) => {
        const msg = err(`${i}.country`) ?? err(`${i}.region`) ?? err(`${i}.postcode`);
        return (
          <div key={i} className="grid gap-1">
            <div className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2">
              <Input
                aria-label={`${t('tax.country')} ${i + 1}`}
                value={r.countryCode}
                maxLength={2}
                disabled={disabled}
                placeholder="US"
                onChange={(e) => patch(i, { countryCode: e.target.value.toUpperCase() })}
                aria-invalid={!!err(`${i}.country`) || undefined}
                className="font-mono uppercase"
              />
              <Input
                aria-label={`${t('tax.region')} ${i + 1}`}
                value={r.regionCode}
                disabled={disabled}
                placeholder={t('tax.wholeCountry')}
                onChange={(e) => patch(i, { regionCode: e.target.value.toUpperCase() })}
                aria-invalid={!!err(`${i}.region`) || undefined}
                className="font-mono"
              />
              <Input
                aria-label={`${t('tax.postcode')} ${i + 1}`}
                value={r.postcodePattern}
                disabled={disabled}
                placeholder={t('tax.anyPostcode')}
                onChange={(e) => patch(i, { postcodePattern: e.target.value })}
                aria-invalid={!!err(`${i}.postcode`) || undefined}
                className="font-mono"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('common.remove')}
                disabled={disabled}
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
            {msg && <p className="text-small text-danger-fg">{msg}</p>}
          </div>
        );
      })}
      {errors.regions && (
        <p role="alert" className="text-small text-danger-fg">
          {t(errors.regions as MessageKey)}
        </p>
      )}
      {!disabled && (
        <Button
          variant="secondary"
          size="sm"
          className="justify-self-start"
          onClick={() =>
            onChange([
              ...rows,
              { countryCode: rows.at(-1)?.countryCode ?? '', regionCode: '', postcodePattern: '' },
            ])
          }
        >
          <Plus />
          {t('tax.addRegion')}
        </Button>
      )}
      <p className="text-small text-fg-muted">{t('tax.regionsHint')}</p>
    </div>
  );
}
