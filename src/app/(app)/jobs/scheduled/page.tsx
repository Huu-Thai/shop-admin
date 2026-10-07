import type { Metadata } from 'next';
import { ScheduledView } from '@/features/system/scheduled-view';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { jobsContext } from '@/server/jobs-context';

export const metadata: Metadata = { title: 'Scheduled jobs' };

export default async function ScheduledJobsPage() {
  const me = await requirePermission('jobs:read');
  const [jobs, ctx] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/jobs')),
    jobsContext(me),
  ]);
  return (
    <ScheduledView
      jobs={[...jobs].sort((a, b) => a.name.localeCompare(b.name))}
      types={ctx.types.filter(
        (x) => ctx.runnable.includes(x.type) || jobs.some((j) => j.type === x.type),
      )}
      refs={ctx.refs}
      canWrite={hasPermission(me.permissions, 'jobs:write')}
    />
  );
}
