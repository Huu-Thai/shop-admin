import type { Metadata } from 'next';
import { ImportView } from '@/features/system/import-view';
import { requirePermission } from '@/server/auth';
import { jobsContext } from '@/server/jobs-context';

export const metadata: Metadata = { title: 'Import' };

export default async function ImportPage({ searchParams }: PageProps<'/jobs/import'>) {
  const me = await requirePermission('jobs:read');
  const { type } = await searchParams;
  const ctx = await jobsContext(me);
  const initial = typeof type === 'string' ? type : undefined;
  return (
    <ImportView
      types={ctx.types}
      refs={ctx.refs}
      locales={ctx.locales}
      initialType={initial}
      canWrite={ctx.runnable.length > 0}
    />
  );
}
