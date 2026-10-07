'use server';

import { attempt } from '@/server/action';
import { adminApi, call, type Schemas } from '@/server/api';

const one = (id: string) => ({ params: { path: { id } } });
const paths = ['/jobs', '/jobs/scheduled'];

/** Runs a job type once (exports and maintenance); imports go through `/api/gw/imports`. */
export async function runJob(type: string, params: Record<string, unknown> = {}) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/job-executions', { body: { type, params } })),
    paths,
  );
}
export async function cancelExecution(id: string) {
  return attempt(
    () => call(adminApi().POST('/api/v1/admin/job-executions/{id}/cancel', one(id))),
    paths,
  );
}

export async function createJob(body: Schemas['CreateJobDto']) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/jobs', { body })), paths);
}
export async function updateJob(id: string, body: Schemas['UpdateJobDto']) {
  return attempt(
    () => call(adminApi().PATCH('/api/v1/admin/jobs/{id}', { ...one(id), body })),
    paths,
  );
}
export async function deleteJob(id: string) {
  return attempt(async () => {
    await call(adminApi().DELETE('/api/v1/admin/jobs/{id}', one(id)));
    return null;
  }, paths);
}
export async function runSavedJob(id: string) {
  return attempt(() => call(adminApi().POST('/api/v1/admin/jobs/{id}/run', one(id))), paths);
}
