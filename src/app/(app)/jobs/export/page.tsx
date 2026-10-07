import type { Metadata } from 'next';
import { ExportView } from '@/features/system/export-view';
import { requirePermission } from '@/server/auth';
import { jobsContext } from '@/server/jobs-context';

export const metadata: Metadata = { title: 'Export' };

export default async function ExportPage() {
  const me = await requirePermission('jobs:read');
  const ctx = await jobsContext(me);
  return <ExportView types={ctx.types} refs={ctx.refs} canRun={ctx.runnable} />;
}
