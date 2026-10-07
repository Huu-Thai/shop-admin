import { apiBase, isDemo } from '@/server/env';
import { forward } from '@/server/gateway';
import { getSession } from '@/server/session';

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  return forward(req, path, {
    apiBase: apiBase(),
    session: await getSession(),
    readOnly: isDemo(),
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
