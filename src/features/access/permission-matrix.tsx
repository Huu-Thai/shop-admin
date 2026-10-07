'use client';

import { ShieldCheck } from 'lucide-react';
import { Checkbox, Switch } from '@/components/ui/controls';
import { Tooltip } from '@/components/ui/overlays';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { canGrant, hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/cn';
import { byArea, type Permission, togglePermission } from './tabs';

const ACTION_KEYS: Record<string, MessageKey> = {
  read: 'perm.action.read',
  write: 'perm.action.write',
  publish: 'perm.action.publish',
};

/**
 * Permissions as a grid: one row per area, one checkbox per action. Permissions the signed-in
 * admin doesn't hold themselves are shown but can't be granted (the shop refuses escalation).
 */
export function PermissionMatrix({
  permissions,
  value,
  onChange,
  granted,
  disabled,
  invalid,
}: {
  permissions: Permission[];
  value: string[];
  onChange: (value: string[]) => void;
  /** The signed-in admin's own permissions. */
  granted: string[];
  disabled?: boolean;
  invalid?: boolean;
}) {
  const { t } = useI18n();
  const full = value.includes('*');
  const label = (area: string) => {
    const key = `perm.area.${area}` as MessageKey;
    const text = t(key);
    return text === key ? area : text;
  };
  const action = (key: string) => {
    const a = key.split(':')[1];
    return ACTION_KEYS[a] ? t(ACTION_KEYS[a]) : a;
  };

  return (
    <div className={cn('grid gap-3', invalid && 'rounded-lg ring-1 ring-danger')}>
      <label
        className={cn(
          'flex items-start justify-between gap-4 rounded-lg border p-4',
          full ? 'border-accent bg-accent-soft' : 'border-border',
        )}
      >
        <span className="flex gap-3">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 text-fg-muted" />
          <span>
            <span className="block text-body font-medium">{t('perm.full')}</span>
            <span className="block text-small text-fg-muted">{t('perm.fullHint')}</span>
          </span>
        </span>
        <Switch
          checked={full}
          disabled={disabled || !canGrant(granted, '*')}
          onCheckedChange={(on) => onChange(on ? ['*'] : [])}
        />
      </label>
      {!full && (
        <div className="overflow-hidden rounded-lg border border-border">
          {byArea(permissions).map((g, i) => {
            const allOn = g.perms.every((p) => hasPermission(value, p.key));
            return (
              <div
                key={g.area}
                className={cn(
                  'flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5',
                  i > 0 && 'border-t border-border',
                )}
              >
                <label className="flex min-w-44 flex-1 items-center gap-2.5 text-body font-medium">
                  <Checkbox
                    aria-label={t('perm.allIn', { area: label(g.area) })}
                    checked={
                      allOn
                        ? true
                        : g.perms.some((p) => hasPermission(value, p.key))
                          ? 'indeterminate'
                          : false
                    }
                    disabled={disabled || !g.perms.every((p) => canGrant(granted, p.key))}
                    onCheckedChange={(c) =>
                      onChange(
                        c === true
                          ? [
                              ...new Set([
                                ...value.filter((v) => !v.startsWith(`${g.area}:`)),
                                ...g.perms.map((p) => p.key),
                              ]),
                            ]
                          : g.perms.reduce(
                              (v, p) => togglePermission(v, p.key, false, permissions),
                              value,
                            ),
                      )
                    }
                  />
                  {label(g.area)}
                </label>
                <span className="flex flex-wrap gap-x-5 gap-y-2">
                  {g.perms.map((p) => (
                    <Tooltip key={p.key} content={p.description}>
                      <label className="flex items-center gap-2 text-small text-fg-muted">
                        <Checkbox
                          checked={hasPermission(value, p.key)}
                          disabled={disabled || !canGrant(granted, p.key)}
                          onCheckedChange={(c) =>
                            onChange(togglePermission(value, p.key, c === true, permissions))
                          }
                        />
                        {action(p.key)}
                      </label>
                    </Tooltip>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** "12 permissions", "Full access", or the area names. */
export function PermissionSummary({ value }: { value: string[] }) {
  const { t } = useI18n();
  if (value.includes('*')) return <span className="font-medium text-fg">{t('perm.full')}</span>;
  return <span>{t('perm.count', { n: value.length })}</span>;
}
