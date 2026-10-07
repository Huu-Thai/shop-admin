import type { Metadata } from 'next';
import { ActivityView } from '@/features/system/activity-view';
import { EXECUTION_STATUSES, localizeJobTypes } from '@/features/system/job-params';
import { getT } from '@/i18n/server';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';

export const metadata: Metadata = { title: 'Jobs' };

const LIMIT = 25;

export default async function JobsPage({ searchParams }: PageProps<'/jobs'>) {
  await requirePermission('jobs:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [list, types] = await Promise.all([
    call(
      adminApi().GET('/api/v1/admin/job-executions', {
        params: {
          query: {
            page,
            limit: LIMIT,
            order: 'desc',
            status: EXECUTION_STATUSES.find((s) => s === sp.status),
            type:
              typeof sp.type === 'string' && /^[a-z0-9.-]{1,64}$/.test(sp.type)
                ? sp.type
                : undefined,
          },
        },
      }),
    ),
    call(adminApi().GET('/api/v1/admin/jobs/types')).then(async (types) =>
      localizeJobTypes(types, await getT()),
    ),
  ]);
  return (
    <ActivityView
      executions={list.data}
      total={list.total}
      page={page}
      limit={LIMIT}
      types={types}
    />
  );
}
