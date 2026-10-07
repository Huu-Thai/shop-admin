'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useI18n } from '@/i18n/client';
import { runAction } from '@/lib/action-client';
import type { Schemas } from '@/server/api';
import { shipOrder } from './actions';
import { openToShip } from './order-math';

/** Ship some or all open lines with a carrier and tracking. */
export function ShipDialog({
  order,
  carriers,
  onClose,
}: {
  order: Schemas['AdminOrderDto'];
  carriers: string[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const lines = order.items.filter((l) => openToShip(l) > 0);
  const [qty, setQty] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.id, String(openToShip(l))])),
  );
  const [carrier, setCarrier] = useState(carriers[0] ?? '');
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsed = lines.map((l) => ({ l, n: Number(qty[l.id]) }));
  const bad = parsed.some(({ l, n }) => !Number.isInteger(n) || n < 0 || n > openToShip(l));
  const chosen = parsed.filter(({ n }) => n > 0);
  const everything = !bad && parsed.every(({ l, n }) => n === openToShip(l));
  const errors = {
    carrier: !carrier.trim() ? t('ship.err.carrier') : undefined,
    qty: bad ? t('ship.err.qty') : !chosen.length ? t('ship.err.none') : undefined,
    url: trackingUrl && !/^https?:\/\/\S+$/.test(trackingUrl) ? t('ship.err.url') : undefined,
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl"
        title={t('ship.title', { number: order.number })}
        description={t('ship.hint')}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              loading={saving}
              onClick={async () => {
                setTouched(true);
                if (Object.values(errors).some(Boolean)) return;
                setSaving(true);
                const ok = await runAction(
                  shipOrder(order.id, {
                    carrier: carrier.trim(),
                    ...(tracking.trim() ? { trackingNumber: tracking.trim() } : {}),
                    ...(trackingUrl.trim() ? { trackingUrl: trackingUrl.trim() } : {}),
                    ...(everything
                      ? {}
                      : { items: chosen.map(({ l, n }) => ({ orderItemId: l.id, quantity: n })) }),
                  }),
                );
                setSaving(false);
                if (ok) {
                  const { toast } = await import('sonner');
                  toast.success(t('ship.done', { number: ok.number }));
                  onClose();
                  router.refresh();
                }
              }}
            >
              {t('ship.submit')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div className="-mx-6 border-y border-border">
            <Table>
              <THead>
                <tr>
                  <TH>{t('prod.product')}</TH>
                  <TH data-align="right">{t('ship.open')}</TH>
                  <TH data-align="right" className="w-28">
                    {t('ship.qty')}
                  </TH>
                </tr>
              </THead>
              <TBody>
                {lines.map((l) => (
                  <TR key={l.id}>
                    <TD>
                      <span className="block font-medium">{l.name}</span>
                      <span className="block font-mono text-caption text-fg-muted">{l.sku}</span>
                    </TD>
                    <TD data-align="right">{openToShip(l)}</TD>
                    <TD data-align="right">
                      <Input
                        aria-label={`${t('ship.qty')} · ${l.sku}`}
                        inputMode="numeric"
                        value={qty[l.id]}
                        onChange={(e) => setQty((q) => ({ ...q, [l.id]: e.target.value }))}
                        className="tabular h-9 text-right"
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          {touched && errors.qty && (
            <p role="alert" className="-mt-2 text-small text-danger-fg">
              {errors.qty}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="ship-carrier"
              label={t('ship.carrier')}
              required
              error={touched ? errors.carrier : undefined}
            >
              <Input
                id="ship-carrier"
                list="ship-carriers"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </Field>
            <datalist id="ship-carriers">
              {carriers.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Field id="ship-tracking" label={t('ship.tracking')}>
              <Input
                id="ship-tracking"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field
              id="ship-url"
              label={t('ship.trackingUrl')}
              className="sm:col-span-2"
              error={touched ? errors.url : undefined}
            >
              <Input
                id="ship-url"
                type="url"
                placeholder="https://"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
