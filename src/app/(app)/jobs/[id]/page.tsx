import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExecutionDetail } from '@/features/system/execution-detail';
import { hasPermission } from '@/lib/permissions';
import { localizeJobTypes } from '@/features/system/job-params';
import { getT } from '@/i18n/server';
import { adminApi, ApiError, call } from '@/server/api';
import { requirePermission } from '@/server/auth';
import { isUuid } from '@/server/content-context';

export const metadata: Metadata = { title: 'Job run' };

export default async function ExecutionPage({ params }: PageProps<'/jobs/[id]'>) {
  const me = await requirePermission('jobs:read');
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let execution;
  try {
    execution = await call(
      adminApi().GET('/api/v1/admin/job-executions/{id}', { params: { path: { id } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const types = await call(adminApi().GET('/api/v1/admin/jobs/types')).then(async (types) =>
    localizeJobTypes(types, await getT()),
  );
  const type = types.find((x) => x.type === execution.type);
  return (
    <ExecutionDetail
      execution={execution}
      type={type}
      canWrite={
        hasPermission(me.permissions, 'jobs:write') &&
        (!type || hasPermission(me.permissions, type.permission))
      }
    />
  );
}
