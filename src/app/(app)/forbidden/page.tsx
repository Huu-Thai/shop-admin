import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { getT } from '@/i18n/server';

export const metadata: Metadata = { title: 'No access' };

export default async function ForbiddenPage({ searchParams }: PageProps<'/forbidden'>) {
  const t = await getT();
  const raw = (await searchParams).permission;
  const permission = typeof raw === 'string' && /^[\w*:-]{1,64}$/.test(raw) ? raw : '—';
  return (
    <EmptyState
      className="min-h-[60vh]"
      icon={<ShieldAlert />}
      title={t('forbidden.title')}
      description={
        <>
          {t('forbidden.body')}{' '}
          <code className="rounded-xs bg-surface-muted px-1.5 py-0.5 font-mono text-small text-fg">
            {permission}
          </code>
        </>
      }
      action={
        <Button asChild variant="secondary">
          <Link href="/">{t('forbidden.back')}</Link>
        </Button>
      }
    />
  );
}
