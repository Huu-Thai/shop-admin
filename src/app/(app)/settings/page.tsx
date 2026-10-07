import type { Metadata } from 'next';
import { SettingsView } from '@/features/system/settings-view';
import { getMe } from '@/server/auth';
import { env } from '@/server/env';
import pkg from '../../../../package.json';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const me = await getMe();
  // Host only: the API URL may carry nothing secret, but no path or credentials are shown either.
  const apiHost = (() => {
    try {
      return new URL(env().SHOP_API_URL).host;
    } catch {
      return '—';
    }
  })();
  return <SettingsView me={me} apiHost={apiHost} version={pkg.version} />;
}
