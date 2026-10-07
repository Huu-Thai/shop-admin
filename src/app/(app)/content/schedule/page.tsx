import type { Metadata } from 'next';
import { ScheduleView } from '@/features/content/schedule-view';
import { CONTENT_TYPES, SCHEDULE_STATUSES } from '@/features/content/tabs';
import { adminApi, call } from '@/server/api';
import { requirePermission } from '@/server/auth';

export const metadata: Metadata = { title: 'Schedule' };

const LIMIT = 50;

export default async function SchedulePage({ searchParams }: PageProps<'/content/schedule'>) {
  await requirePermission('cms:read');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  // Default: what is still to come, soonest first; any other filter shows history, newest first.
  const status =
    sp.status === 'all' ? undefined : (SCHEDULE_STATUSES.find((s) => s === sp.status) ?? 'PENDING');
  const list = await call(
    adminApi().GET('/api/v1/admin/schedules', {
      params: {
        query: {
          page,
          limit: LIMIT,
          order: status === 'PENDING' ? 'asc' : 'desc',
          status,
          targetType: CONTENT_TYPES.find((x) => x === sp.targetType),
        },
      },
    }),
  );
  return <ScheduleView schedules={list.data} total={list.total} page={page} limit={LIMIT} />;
}
