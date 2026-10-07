import { Compass } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { getT } from '@/i18n/server';

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={<Compass />}
        title={t('notFound.title')}
        description={t('notFound.body')}
        action={
          <Button asChild variant="secondary">
            <Link href="/">{t('forbidden.back')}</Link>
          </Button>
        }
      />
    </main>
  );
}
