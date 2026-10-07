'use client';

import { Copy, Download, Plus, Search, Ticket, Trash2, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';
import { Switch } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/feedback';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import type { MessageKey } from '@/i18n';
import { intlLocale } from '@/i18n';
import { runAction } from '@/lib/action-client';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';
import { fromLocalInput } from '../pricing/shared';
import { createCoupon, deleteCoupon, generateCoupons, updateCoupon } from './actions';
import { COUPON_CODE } from './tabs';

type Coupon = Schemas['CouponDto'];
type Page = Schemas['CouponListDto'];
const LIMIT = 20;

export function couponState(
  c: Coupon,
  now = new Date(),
): 'active' | 'inactive' | 'expired' | 'usedUp' {
  if (!c.isActive) return 'inactive';
  if (c.expiresAt && new Date(c.expiresAt) <= now) return 'expired';
  if (c.usageLimit !== null && c.timesUsed >= c.usageLimit) return 'usedUp';
  return 'active';
}
const STATE_TONE = {
  active: 'success',
  inactive: 'neutral',
  expired: 'warning',
  usedUp: 'info',
} as const;

/** The codes that unlock a coupon-only promotion: list, add one, generate a batch, export. */
export function CouponsPanel({
  promotionId,
  canWrite,
}: {
  promotionId: string;
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [data, setData] = useState<Page | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<'one' | 'batch' | null>(null);
  const [exporting, setExporting] = useState(false);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useCallback(
    (p: number, limit = LIMIT) => {
      const q = new URLSearchParams({ page: String(p), limit: String(limit), order: 'desc' });
      if (search.trim()) q.set('search', search.trim());
      return `marketing/promotions/${promotionId}/coupons?${q}`;
    },
    [promotionId, search],
  );
  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        setData(await gw<Page>(query(p)));
      } catch {
        toast.error(t('media.err.network'));
      } finally {
        setLoading(false);
      }
    },
    [page, query, t],
  );
  useEffect(() => {
    const id = setTimeout(() => void load(page), search ? 250 : 0);
    return () => clearTimeout(id);
  }, [load, page, search]);
  useEffect(() => () => void (poll.current && clearTimeout(poll.current)), []);

  /** A generated batch is written by the worker: reload until the count grows (≤ 30 s). */
  const watchBatch = (before: number, expected: number) => {
    let tries = 0;
    const tick = async () => {
      tries++;
      const next = await gw<Page>(query(1)).catch(() => null);
      if (next) {
        setPage(1);
        setData(next);
      }
      if ((next && next.total >= before + expected) || tries >= 15) {
        if (next && next.total >= before + expected)
          toast.success(t('coupon.batchReady', { n: expected }));
        return;
      }
      poll.current = setTimeout(tick, 2000);
    };
    poll.current = setTimeout(tick, 1000);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: Coupon[] = [];
      for (let p = 1; ; p++) {
        const chunk = await gw<Page>(query(p, 200));
        rows.push(...chunk.data);
        if (rows.length >= chunk.total || !chunk.data.length) break;
      }
      const csv = [
        'code,uses,usage_limit,uses_per_customer,expires_at,active',
        ...rows.map((c) =>
          [
            c.code,
            c.timesUsed,
            c.usageLimit ?? '',
            c.usesPerCustomer ?? '',
            c.expiresAt ?? '',
            c.isActive,
          ].join(','),
        ),
      ].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `coupons-${promotionId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('media.err.network'));
    } finally {
      setExporting(false);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('coupon.title')}
        description={data ? t('coupon.count', { n: data.total }) : t('coupon.hint')}
        actions={
          <>
            {data && data.total > 0 && (
              <Button size="sm" variant="ghost" onClick={exportCsv} loading={exporting}>
                <Download />
                {t('coupon.export')}
              </Button>
            )}
            {canWrite && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setDialog('batch')}>
                  <Wand2 />
                  {t('coupon.generate')}
                </Button>
                <Button size="sm" onClick={() => setDialog('one')}>
                  <Plus />
                  {t('coupon.add')}
                </Button>
              </>
            )}
          </>
        }
      />
      <div className="mt-4 border-y border-border px-5 py-3">
        <label className="relative block max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
          />
          <Input
            aria-label={t('coupon.search')}
            placeholder={t('coupon.search')}
            className="pl-9 font-mono"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <div className={cn('transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
        {data && data.data.length ? (
          <Table>
            <THead>
              <tr>
                <TH>{t('coupon.code')}</TH>
                <TH>{t('common.status')}</TH>
                <TH data-align="right">{t('promo.used')}</TH>
                <TH className="hidden md:table-cell" data-align="right">
                  {t('promo.perCustomer')}
                </TH>
                <TH className="hidden lg:table-cell">{t('coupon.expires')}</TH>
                {canWrite && (
                  <TH data-align="right">
                    <span className="sr-only">{t('list.actions')}</span>
                  </TH>
                )}
              </tr>
            </THead>
            <TBody>
              {data.data.map((c) => {
                const state = couponState(c);
                return (
                  <TR key={c.id}>
                    <TD>
                      <span className="flex items-center gap-1.5">
                        <code className="font-mono text-small font-medium">{c.code}</code>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7"
                          aria-label={t('coupon.copy', { code: c.code })}
                          onClick={async () => {
                            await navigator.clipboard?.writeText(c.code).catch(() => undefined);
                            toast.success(t('coupon.copied'));
                          }}
                        >
                          <Copy />
                        </Button>
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={STATE_TONE[state]}>{t(`coupon.state.${state}`)}</Badge>
                    </TD>
                    <TD className="tabular" data-align="right">
                      {c.timesUsed}
                      <span className="text-fg-muted"> / {c.usageLimit ?? '∞'}</span>
                    </TD>
                    <TD className="tabular hidden text-fg-muted md:table-cell" data-align="right">
                      {c.usesPerCustomer ?? '∞'}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-fg-muted lg:table-cell">
                      {c.expiresAt ? formatDate(c.expiresAt, intl, true) : t('coupon.never')}
                    </TD>
                    {canWrite && (
                      <TD data-align="right">
                        <span className="inline-flex items-center gap-1">
                          <Switch
                            aria-label={t('coupon.toggle', { code: c.code })}
                            checked={c.isActive}
                            onCheckedChange={async (isActive) => {
                              const ok = await runAction(updateCoupon(c.id, { isActive }), {
                                success: isActive ? t('coupon.enabled') : t('coupon.disabled'),
                              });
                              if (ok) void load();
                            }}
                          />
                          <Confirm
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-fg-muted hover:text-danger-fg"
                                aria-label={t('coupon.delete', { code: c.code })}
                              >
                                <Trash2 />
                              </Button>
                            }
                            title={t('coupon.deleteTitle', { code: c.code })}
                            description={t('coupon.deleteBody')}
                            confirmLabel={t('common.delete')}
                            cancelLabel={t('common.cancel')}
                            onConfirm={async () => {
                              const ok = await runAction(deleteCoupon(c.id), {
                                success: t('coupon.deleted'),
                              });
                              if (ok !== undefined) void load();
                              return ok !== undefined;
                            }}
                          />
                        </span>
                      </TD>
                    )}
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          data && (
            <EmptyState
              icon={<Ticket />}
              title={search ? t('list.noMatch') : t('coupon.empty')}
              description={search ? undefined : t('coupon.emptyBody')}
            />
          )
        )}
      </div>
      {data && data.total > LIMIT && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-small text-fg-muted">
          <span>{t('list.page', { page, pages })}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              {t('list.previous')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= pages || loading}
              onClick={() => setPage(page + 1)}
            >
              {t('list.next')}
            </Button>
          </div>
        </div>
      )}
      {dialog === 'one' && (
        <CouponDialog
          promotionId={promotionId}
          onClose={() => setDialog(null)}
          onDone={() => {
            setSearch('');
            setPage(1);
            void load(1);
          }}
        />
      )}
      {dialog === 'batch' && (
        <BatchDialog
          promotionId={promotionId}
          onClose={() => setDialog(null)}
          onQueued={(count) => watchBatch(data?.total ?? 0, count)}
        />
      )}
    </Card>
  );
}

/** Usage limit, per-customer limit and expiry, shared by both dialogs. */
function useLimits(defaultUsage = '', usageHint: MessageKey = 'coupon.usageHint') {
  const { t } = useI18n();
  const [usageLimit, setUsageLimit] = useState(defaultUsage);
  const [perCustomer, setPerCustomer] = useState('');
  const [expires, setExpires] = useState('');
  const int = (v: string) =>
    v.trim() ? (/^\d{1,9}$/.test(v) && Number(v) >= 1 ? Number(v) : NaN) : undefined;
  const usage = int(usageLimit);
  const per = int(perCustomer);
  const at = expires ? fromLocalInput(expires) : null;
  const errors = {
    usageLimit: Number.isNaN(usage) ? t('rule.err.quantity') : undefined,
    perCustomer: Number.isNaN(per) ? t('rule.err.quantity') : undefined,
    expires: expires && (!at || new Date(at) <= new Date()) ? t('pub.err.past') : undefined,
  };
  const body = {
    ...(usage !== undefined ? { usageLimit: usage } : {}),
    ...(per !== undefined ? { usesPerCustomer: per } : {}),
    ...(at ? { expiresAt: at } : {}),
  };
  const fields = (touched: boolean) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        id="cpn-usage"
        label={t('coupon.usageLimit')}
        hint={t(usageHint)}
        error={touched ? errors.usageLimit : undefined}
      >
        <Input
          id="cpn-usage"
          inputMode="numeric"
          className="tabular"
          placeholder={t('rule.noLimit')}
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value.replace(/\D/g, ''))}
        />
      </Field>
      <Field
        id="cpn-per"
        label={t('promo.perCustomer')}
        error={touched ? errors.perCustomer : undefined}
      >
        <Input
          id="cpn-per"
          inputMode="numeric"
          className="tabular"
          placeholder={t('rule.noLimit')}
          value={perCustomer}
          onChange={(e) => setPerCustomer(e.target.value.replace(/\D/g, ''))}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field
          id="cpn-exp"
          label={t('coupon.expires')}
          hint={t('pub.localTime')}
          error={touched ? errors.expires : undefined}
        >
          <Input
            id="cpn-exp"
            type="datetime-local"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
  return { errors, body, fields };
}

function CouponDialog({
  promotionId,
  onClose,
  onDone,
}: {
  promotionId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const limits = useLimits();
  const codeError = !COUPON_CODE.test(code.trim()) ? t('coupon.err.code') : undefined;

  const save = async () => {
    setTouched(true);
    if (codeError || Object.values(limits.errors).some(Boolean)) return;
    setSaving(true);
    const ok = await runAction(createCoupon(promotionId, { code: code.trim(), ...limits.body }), {
      success: t('coupon.added'),
    });
    setSaving(false);
    if (ok) {
      onClose();
      onDone();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('coupon.add')}
        description={t('coupon.addHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('coupon.add')}
            </Button>
          </>
        }
      >
        <Field
          id="cpn-code"
          label={t('coupon.code')}
          required
          hint={t('coupon.codeHint')}
          error={touched ? codeError : undefined}
        >
          <Input
            id="cpn-code"
            autoFocus
            autoComplete="off"
            className="font-mono uppercase"
            value={code}
            placeholder="SUMMER10"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
          />
        </Field>
        {limits.fields(touched)}
      </DialogContent>
    </Dialog>
  );
}

function BatchDialog({
  promotionId,
  onClose,
  onQueued,
}: {
  promotionId: string;
  onClose: () => void;
  onQueued: (count: number) => void;
}) {
  const { t } = useI18n();
  const [count, setCount] = useState('100');
  const [prefix, setPrefix] = useState('');
  const [length, setLength] = useState('10');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const limits = useLimits('1', 'coupon.batchUsageHint');
  const n = /^\d{1,6}$/.test(count) ? Number(count) : 0;
  const len = /^\d{1,2}$/.test(length) ? Number(length) : 0;
  const errors = {
    count: n < 1 || n > 100_000 ? t('coupon.err.count') : undefined,
    prefix:
      prefix && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/.test(prefix)
        ? t('coupon.err.prefix')
        : undefined,
    length: len < 6 || len > 32 ? t('coupon.err.length') : undefined,
  };
  const sample = `${prefix}${'X'.repeat(Math.min(Math.max(len, 0), 32))}`;

  const save = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || Object.values(limits.errors).some(Boolean)) return;
    setSaving(true);
    const r = await runAction(
      generateCoupons(promotionId, {
        count: n,
        length: len,
        ...(prefix ? { prefix } : {}),
        // Batch codes default to one use each (the API's default).
        usageLimit: 1,
        ...limits.body,
      }),
      { success: t('coupon.batchQueued', { n }) },
    );
    setSaving(false);
    if (r) {
      onClose();
      onQueued(r.count);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('coupon.generate')}
        description={t('coupon.generateHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('coupon.generateN', { n: n || 0 })}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            id="cpn-count"
            label={t('coupon.howMany')}
            required
            error={touched ? errors.count : undefined}
          >
            <Input
              id="cpn-count"
              inputMode="numeric"
              className="tabular"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field
            id="cpn-prefix"
            label={t('coupon.prefix')}
            error={touched ? errors.prefix : undefined}
          >
            <Input
              id="cpn-prefix"
              className="font-mono uppercase"
              placeholder="BF-"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/\s/g, ''))}
            />
          </Field>
          <Field
            id="cpn-length"
            label={t('coupon.length')}
            error={touched ? errors.length : undefined}
          >
            <Input
              id="cpn-length"
              inputMode="numeric"
              className="tabular"
              value={length}
              onChange={(e) => setLength(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>
        <p className="text-small text-fg-muted">
          {t('coupon.sample')} <code className="font-mono text-fg">{sample}</code>
        </p>
        {limits.fields(touched)}
      </DialogContent>
    </Dialog>
  );
}
