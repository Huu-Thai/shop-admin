'use client';

import {
  Check,
  Globe,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  SwatchBook,
  UserCog,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { DropdownMenu as M } from 'radix-ui';
import { useTransition } from 'react';
import { Avatar } from '@/components/ui/feedback';
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/overlays';
import { useI18n } from '@/i18n/client';
import { LOCALE_COOKIE, LOCALES } from '@/i18n';
import { applyPreset, setPreference } from '@/lib/preferences';
import { usePreset } from '@/lib/use-document';
import { signOut } from '@/server/auth-actions';
import { themeConfig } from '@/theme/config';

export interface ShellUser {
  name: string;
  email: string;
  role: string;
}

const subContent =
  'animate-pop z-50 min-w-44 rounded-lg border border-border bg-surface p-1 text-fg shadow-lg';
const subTrigger =
  'flex h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 text-body outline-none select-none data-[highlighted]:bg-surface-muted data-[state=open]:bg-surface-muted [&_svg]:size-4 [&_svg]:text-fg-muted';

function Tick({ on }: { on: boolean }) {
  return <Check aria-hidden className={on ? 'ml-auto !text-fg' : 'ml-auto opacity-0'} />;
}

export function UserMenu({ user }: { user: ShellUser }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const preset = usePreset();
  const [, startTransition] = useTransition();

  const chooseLocale = (id: string) => {
    setPreference(LOCALE_COOKIE, id);
    router.refresh();
  };

  return (
    <Menu>
      <MenuTrigger
        className="focus-ring flex items-center gap-2.5 rounded-full p-0.5 pr-2 hover:bg-surface-muted md:pr-3"
        aria-label={`${t('user.account')} ${user.email}`}
      >
        <Avatar name={user.name || user.email} className="size-8 text-caption" />
        <span className="hidden min-w-0 text-left md:block">
          <span className="block max-w-40 truncate text-small font-medium text-fg">
            {user.name}
          </span>
          <span className="block max-w-40 truncate text-caption text-fg-muted">{user.role}</span>
        </span>
      </MenuTrigger>
      <MenuContent className="w-64">
        <MenuLabel className="pb-2">
          <span className="block text-caption text-fg-muted">{t('user.account')}</span>
          <span className="block truncate text-small font-medium text-fg">{user.email}</span>
        </MenuLabel>
        <MenuSeparator />
        <MenuGroup>
          <M.Sub>
            <M.SubTrigger className={subTrigger}>
              <Sun aria-hidden />
              {t('user.appearance')}
            </M.SubTrigger>
            <M.Portal>
              <M.SubContent className={subContent} sideOffset={6}>
                {(
                  [
                    ['light', 'user.light', Sun],
                    ['dark', 'user.dark', Moon],
                    ['system', 'user.system', Monitor],
                  ] as const
                ).map(([id, key, Icon]) => (
                  <MenuItem key={id} onSelect={() => setTheme(id)}>
                    <Icon aria-hidden />
                    {t(key)}
                    <Tick on={theme === id} />
                  </MenuItem>
                ))}
              </M.SubContent>
            </M.Portal>
          </M.Sub>
          <M.Sub>
            <M.SubTrigger className={subTrigger}>
              <Palette aria-hidden />
              {t('user.accent')}
            </M.SubTrigger>
            <M.Portal>
              <M.SubContent className={subContent} sideOffset={6}>
                {themeConfig.presets.map((p) => (
                  <MenuItem key={p.id} onSelect={() => applyPreset(p.id)}>
                    <span
                      aria-hidden
                      className="size-4 rounded-full border border-border-strong"
                      style={{ background: p.swatch }}
                    />
                    {p.label}
                    <Tick on={preset === p.id} />
                  </MenuItem>
                ))}
              </M.SubContent>
            </M.Portal>
          </M.Sub>
          <M.Sub>
            <M.SubTrigger className={subTrigger}>
              <Globe aria-hidden />
              {t('user.language')}
            </M.SubTrigger>
            <M.Portal>
              <M.SubContent className={subContent} sideOffset={6}>
                {LOCALES.map((l) => (
                  <MenuItem key={l.id} onSelect={() => chooseLocale(l.id)} lang={l.id}>
                    {l.label}
                    <Tick on={locale === l.id} />
                  </MenuItem>
                ))}
              </M.SubContent>
            </M.Portal>
          </M.Sub>
          <MenuItem asChild>
            <Link href="/settings">
              <UserCog aria-hidden />
              {t('user.settings')}
            </Link>
          </MenuItem>
          <MenuItem asChild>
            <Link href="/style-guide">
              <SwatchBook aria-hidden />
              {t('user.styleGuide')}
            </Link>
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem onSelect={() => startTransition(() => signOut())}>
          <LogOut aria-hidden />
          {t('user.signOut')}
        </MenuItem>
        <MenuItem destructive onSelect={() => startTransition(() => signOut(true))}>
          <LogOut aria-hidden />
          {t('user.signOutAll')}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
