'use client';

import { toast } from 'sonner';
import { useI18n } from '@/i18n/client';
import { GatewayError, gw } from '@/lib/gateway-client';
import type { Schemas } from '@/server/api';

/** Opens an export's file through a short-lived signed link. */
export function useDownload() {
  const { t } = useI18n();
  return async (executionId: string) => {
    try {
      const d = await gw<Schemas['DownloadDto']>(`job-executions/${executionId}/download`);
      const a = document.createElement('a');
      a.href = d.url;
      a.download = d.name;
      a.rel = 'noopener';
      a.click();
    } catch (e) {
      toast.error(e instanceof GatewayError ? e.message : t('media.err.network'));
    }
  };
}
