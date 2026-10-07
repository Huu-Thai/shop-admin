'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/client';

/** Active, disabled, or temporarily locked after failed sign-ins. */
export function CustomerStatus({
  status,
  lockedUntil,
}: {
  status: 'ACTIVE' | 'DISABLED';
  lockedUntil: string | null;
}) {
  const { t } = useI18n();
  if (status === 'DISABLED') return <Badge tone="neutral">{t('cust.status.DISABLED')}</Badge>;
  if (lockedUntil && new Date(lockedUntil) > new Date())
    return <Badge tone="warning">{t('cust.status.locked')}</Badge>;
  return (
    <Badge tone="success" dot>
      {t('cust.status.ACTIVE')}
    </Badge>
  );
}
