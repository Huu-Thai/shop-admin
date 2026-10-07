'use client';

import { CalendarClock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { useI18n } from '@/i18n/client';
import { intlLocale } from '@/i18n';
import { formatDate } from '@/lib/format';
import type { MessageKey } from '@/i18n';
import type { Schemas } from '@/server/api';
import { fromLocalInput, toLocalInput } from '../pricing/shared';

export type Publishing = Pick<
  Schemas['CampaignDto'],
  'status' | 'publishedAt' | 'unpublishedAt' | 'visible'
>;

/**
 * Where content is on the publishing track (docs/STYLE-GUIDE.md §2.3): live is success, waiting
 * (scheduled, or live but held back by something else) is info / warning, drafts and archives
 * are neutral.
 */
export function PublishBadge({
  item,
  heldBack,
}: {
  item: Publishing;
  /** Live by itself but not in effect (e.g. its campaign isn't). */
  heldBack?: boolean;
}) {
  const { t } = useI18n();
  if (item.visible)
    return heldBack ? (
      <Badge tone="warning">{t('pub.held')}</Badge>
    ) : (
      <Badge tone="success" dot>
        {t('pub.live')}
      </Badge>
    );
  if (item.status === 'SCHEDULED') return <Badge tone="info">{t('pub.scheduled')}</Badge>;
  if (item.status === 'PUBLISHED') return <Badge tone="warning">{t('pub.ended')}</Badge>;
  if (item.status === 'ARCHIVED') return <Badge tone="neutral">{t('pub.archived')}</Badge>;
  return <Badge tone="neutral">{t('pub.draft')}</Badge>;
}

/** Status, window and publish / unpublish controls (now or scheduled). */
export function PublishPanel({
  item,
  heldBack,
  heldBackHint,
  canWrite,
  onPublish,
  onUnpublish,
}: {
  item: Publishing;
  heldBack?: boolean;
  heldBackHint?: string;
  canWrite: boolean;
  /** Resolve true on success. `at` is an ISO time, or undefined for now. */
  onPublish: (at?: string) => Promise<boolean>;
  onUnpublish: (at?: string) => Promise<boolean>;
}) {
  const { t, locale } = useI18n();
  const intl = intlLocale(locale);
  const [busy, setBusy] = useState<'publish' | 'unpublish' | null>(null);
  const [schedule, setSchedule] = useState<'publish' | 'unpublish' | null>(null);
  const onTrack = item.status === 'PUBLISHED' || item.status === 'SCHEDULED';
  const live = item.visible;
  const run = async (what: 'publish' | 'unpublish') => {
    setBusy(what);
    await (what === 'publish' ? onPublish() : onUnpublish());
    setBusy(null);
  };

  return (
    <Card>
      <CardHeader
        title={t('pub.title')}
        actions={<PublishBadge item={item} heldBack={heldBack} />}
      />
      <CardBody className="grid gap-4 pt-4">
        <dl className="grid gap-2 text-small">
          <div className="flex justify-between gap-4">
            <dt className="text-fg-muted">{t('pub.starts')}</dt>
            <dd className="text-right font-medium">
              {item.publishedAt && onTrack ? formatDate(item.publishedAt, intl, true) : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fg-muted">{t('pub.ends')}</dt>
            <dd className="text-right font-medium">
              {item.unpublishedAt ? formatDate(item.unpublishedAt, intl, true) : t('pub.noEnd')}
            </dd>
          </div>
        </dl>
        {heldBack && heldBackHint && (
          <p className="rounded-md bg-warning-soft px-3 py-2 text-small text-warning-fg">
            {heldBackHint}
          </p>
        )}
        {canWrite && (
          <div className="grid gap-2">
            {!live && (
              <Button onClick={() => run('publish')} loading={busy === 'publish'}>
                <Eye />
                {t('pub.publishNow')}
              </Button>
            )}
            {onTrack && (
              <Button
                variant="secondary"
                onClick={() => run('unpublish')}
                loading={busy === 'unpublish'}
              >
                <EyeOff />
                {live ? t('pub.unpublishNow') : t('pub.cancelSchedule')}
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              {!live && (
                <Button variant="ghost" size="sm" onClick={() => setSchedule('publish')}>
                  <CalendarClock />
                  {t('pub.schedule')}
                </Button>
              )}
              {onTrack && (
                <Button variant="ghost" size="sm" onClick={() => setSchedule('unpublish')}>
                  <CalendarClock />
                  {t('pub.scheduleEnd')}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardBody>
      {schedule && (
        <ScheduleDialog
          mode={schedule}
          initial={schedule === 'publish' ? item.publishedAt : item.unpublishedAt}
          onClose={() => setSchedule(null)}
          onSubmit={(at) => (schedule === 'publish' ? onPublish(at) : onUnpublish(at))}
        />
      )}
    </Card>
  );
}

function ScheduleDialog({
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  mode: 'publish' | 'unpublish';
  initial: string | null;
  onClose: () => void;
  onSubmit: (at: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const future = initial && new Date(initial) > new Date() ? initial : null;
  const [value, setValue] = useState(toLocalInput(future));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const iso = fromLocalInput(value);
  const error = !iso
    ? t('pub.err.when')
    : new Date(iso) <= new Date()
      ? t('pub.err.past')
      : undefined;

  const save = async () => {
    setTouched(true);
    if (error || !iso) return;
    setSaving(true);
    const ok = await onSubmit(iso);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={mode === 'publish' ? t('pub.schedule') : t('pub.scheduleEnd')}
        description={mode === 'publish' ? t('pub.scheduleHint') : t('pub.scheduleEndHint')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('pub.confirmSchedule')}
            </Button>
          </>
        }
      >
        <Field
          id="pub-at"
          label={mode === 'publish' ? t('pub.starts') : t('pub.ends')}
          hint={t('pub.localTime')}
          error={touched ? error : undefined}
        >
          <Input
            id="pub-at"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

/** "1 Nov – 30 Nov", "From 1 Nov", or "—". */
export function windowLabel(
  c: { status: string; publishedAt: string | null; unpublishedAt: string | null },
  intl: string,
  t: (k: MessageKey, p?: Record<string, string | number>) => string,
) {
  const from = c.publishedAt && c.status !== 'DRAFT' ? formatDate(c.publishedAt, intl) : null;
  const to = c.unpublishedAt ? formatDate(c.unpublishedAt, intl) : null;
  if (from && to) return `${from} – ${to}`;
  if (from) return t('pub.from', { date: from });
  if (to) return t('pub.until', { date: to });
  return '—';
}
