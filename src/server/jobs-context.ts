import 'server-only';
import { localizeJobTypes } from '@/features/system/job-params';
import type { JobRefs } from '@/features/system/params-form';
import { getT } from '@/i18n/server';
import { hasPermission } from '@/lib/permissions';
import { adminApi, call } from './api';
import type { Me } from './auth';
import { getLocales, getPriceBooks, getSources, getStores, getWebsites } from './catalog';

const orEmpty = <T>(p: Promise<T[]>): Promise<T[]> => p.catch(() => []);

/** Job types and the reference lists their parameter forms offer (empty without permission). */
export async function jobsContext(me: Me) {
  const can = (p: string) => hasPermission(me.permissions, p);
  const [rawTypes, priceBooks, sources, stores, websites, locales, t] = await Promise.all([
    call(adminApi().GET('/api/v1/admin/jobs/types')),
    can('pricing:read') ? orEmpty(getPriceBooks()) : [],
    can('inventory:read') ? orEmpty(getSources()) : [],
    orEmpty(getStores()),
    orEmpty(getWebsites()),
    orEmpty(getLocales()),
    getT(),
  ]);
  const types = localizeJobTypes(rawTypes, t);
  const refs: JobRefs = { priceBooks, sources, stores, websites };
  return {
    types,
    refs,
    locales: locales.map((l) => l.code),
    /** Types this admin may run: jobs:write and the type's own permission. */
    runnable: can('jobs:write') ? types.filter((x) => can(x.permission)).map((x) => x.type) : [],
  };
}
