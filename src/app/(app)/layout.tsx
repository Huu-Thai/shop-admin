import { cookies } from 'next/headers';
import { AppShell } from '@/components/shell/app-shell';
import { navFor } from '@/features/registry';
import { SIDEBAR_COOKIE } from '@/lib/preferences';
import { getMe } from '@/server/auth';
import { isDemo } from '@/server/env';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const me = await getMe();
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'collapsed';
  const name = [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email.split('@')[0];
  const role = me.roles[0]?.replace(/[-_]/g, ' ') ?? '';
  return (
    <AppShell
      user={{
        name,
        email: me.email,
        role: role.charAt(0).toUpperCase() + role.slice(1),
      }}
      sections={navFor(me.permissions)}
      initialCollapsed={collapsed}
      demo={isDemo()}
    >
      {children}
    </AppShell>
  );
}
